import assert from "node:assert/strict"
import { test } from "node:test"
import { internalThemisSourceHref } from "../../lib/themis-links"

const website = "https://kl1me.github.io/souzana"

test("own-site sources become internal routes without duplicating the GitHub Pages base path", () => {
  assert.equal(internalThemisSourceHref(`${website}/team/`, website), "/team/")
  assert.equal(internalThemisSourceHref(`${website}/practice-areas/?topic=civil#civil-law`, `${website}/`), "/practice-areas/?topic=civil#civil-law")
  assert.equal(internalThemisSourceHref(website, website), "/")
  assert.equal(internalThemisSourceHref(`${website}/#company`, website), "/#company")
  assert.equal(internalThemisSourceHref("https://example.test/team/", "https://example.test/"), "/team/")
})

test("external sources and other GitHub projects stay external", () => {
  for (const source of ["https://www.gov.gr/example", "https://kl1me.github.io/other/team/", "https://kl1me.github.io/souzana-other/team/", "http://kl1me.github.io/souzana/team/"]) {
    assert.equal(internalThemisSourceHref(source, website), null)
  }
})

test("malformed and credential-bearing source URLs cannot become internal links", () => {
  for (const source of ["not a URL", "javascript:alert(1)", "https://user:password@kl1me.github.io/souzana/team/", "https://kl1me.github.io.attacker.test/souzana/team/"]) {
    assert.equal(internalThemisSourceHref(source, website), null)
  }
})

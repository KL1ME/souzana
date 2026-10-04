import assert from "node:assert/strict"
import { test } from "node:test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import ThemisReply from "../../components/themis/ThemisReply"
import type { ThemisMessage } from "../../lib/themis"

function render(message: ThemisMessage) {
  return renderToStaticMarkup(createElement(ThemisReply, { message, onInternalSource: () => {} }))
}

test("contact answers keep separate labels and list items with the original source citation", () => {
  const content = "**Τηλέφωνα**\n- +30 211 7500016\n- +30 211 7500017\n\n**Email**\nlawfirm@klimentidi.gr\n\nΠηγές: [1]"
  const result = render({ role: "assistant", content,
    sources: [{ id: "contact", title: "Στοιχεία επικοινωνίας", url: "https://kl1me.github.io/souzana/" }],
    citations: [{ start: content.indexOf("[1]"), end: content.length, sourceIndex: 0 }],
  })
  assert.match(result, /<strong[^>]*>Τηλέφωνα<\/strong>/)
  assert.match(result, /<li>\+30 211 7500016<\/li><li>\+30 211 7500017<\/li>/)
  assert.match(result, /<strong[^>]*>Email<\/strong>\nlawfirm@klimentidi.gr/)
  assert.match(result, /<a[^>]*aria-label="Πηγή: Στοιχεία επικοινωνίας"[^>]*href="\/">\[1\]<\/a>/)
  assert.doesNotMatch(result, /\*\*|<p[^>]*>.*<ul>/)
})

test("formatting retains UTF-16 source offsets inside bold text, headings and numbered steps", () => {
  const content = "### Διαδικασία\r\n\r\n3. Δείτε **την υπηρεσία ⚖️ [1]**.\r\n4. Διαβάστε την ανακοίνωση [2]."
  const result = render({ role: "assistant", content,
    sources: [
      { id: "gov", title: "Επίσημη υπηρεσία", url: "https://www.gov.gr/service" },
      { id: "eu", title: "Ανακοίνωση", url: "https://europa.eu/notice" },
    ],
    citations: ["[1]", "[2]"].map((label, sourceIndex) => ({ start: content.indexOf(label), end: content.indexOf(label) + label.length, sourceIndex })),
  })
  assert.match(result, /<p class="font-semibold">Διαδικασία<\/p>/)
  assert.match(result, /<ol[^>]*start="3"/)
  assert.match(result, /<strong[^>]*>την υπηρεσία ⚖️ <a[^>]*href="https:\/\/www.gov.gr\/service"/)
  assert.match(result, /href="https:\/\/europa.eu\/notice"[^>]*>\[2\]/)
  assert.equal((result.match(/<a /g) ?? []).length, 2)
  assert.equal((result.match(/<li>/g) ?? []).length, 2)
})

test("plain contact labels from a live model remain distinct from their values", () => {
  const result = render({ role: "assistant", content: "Τηλέφωνα\n+30 211 7500016\n+30 211 7500017\n\nEmail\nlawfirm@klimentidi.gr" })
  assert.match(result, /<p class="font-semibold">Τηλέφωνα<\/p><p class="whitespace-pre-wrap">\+30 211 7500016\n\+30 211 7500017<\/p>/)
  assert.match(result, /<p class="font-semibold">Email<\/p><p class="whitespace-pre-wrap">lawfirm@klimentidi.gr<\/p>/)
})

test("untrusted HTML and Markdown links stay text; a citation crossing blocks stays complete", () => {
  const content = '<img src=x onerror="alert(1)"> [click](javascript:alert(1))\n\n- πρώτο\n- δεύτερο'
  const result = render({ role: "assistant", content })
  assert.match(result, /&lt;img/)
  assert.doesNotMatch(result, /<img|<script|<a /)
  assert.match(result, /\[click\]\(javascript:alert\(1\)\)/)
  const start = content.indexOf("πρώτο")
  const cited = render({ role: "assistant", content,
    sources: [{ id: "source", title: "Πηγή", url: "https://www.gov.gr/service" }],
    citations: [{ start, end: content.length, sourceIndex: 0 }],
  })
  assert.match(cited, />πρώτο\n- δεύτερο<\/a>/)
  assert.equal((cited.match(/<a /g) ?? []).length, 1)
})

// Screenshot-shaped fixture with a synthetic session ID; never requested.
const screenshotSourceUrl = `https://webgate.ec.europa.eu/fal/index.html%3BFAL_SESSIONID%3Dfixture-only-${"x".repeat(100)}%211234567890?lang=el&utm_source=openai`

test("the screenshot's verified Markdown session citation becomes a compact source link", () => {
  const claim = "Δεν μπορώ να προτείνω συγκεκριμένο γραφείο χωρίς επαληθευμένα στοιχεία από επίσημη πηγή."
  const citation = `([webgate.ec.europa.eu](${screenshotSourceUrl}))`
  const content = `- ${claim} ${citation}\n\nΑν θέλετε, πείτε μου:\n- τομέα υπόθεσης`
  const message: ThemisMessage = { role: "assistant", content,
    sources: [{ id: "web:1", title: "Επίσημη ευρωπαϊκή πηγή", url: screenshotSourceUrl }],
    citations: [{ start: content.indexOf(citation), end: content.indexOf(citation) + citation.length, sourceIndex: 0 }],
  }
  const originalCitations = structuredClone(message.citations)
  const result = render(message)
  assert.ok(result.includes(`<li>${claim} <a`))
  assert.ok(result.includes(`href="${screenshotSourceUrl.replaceAll("&", "&amp;")}"`))
  assert.match(result, /title="Επίσημη ευρωπαϊκή πηγή" aria-label="Πηγή: Επίσημη ευρωπαϊκή πηγή"/)
  assert.match(result, /target="_blank" rel="noopener noreferrer"[^>]*>\[1\]<\/a><\/li>/)
  assert.doesNotMatch(result, />\(?\[webgate|>https:/)
  assert.equal(message.content, content)
  assert.deepEqual(message.citations, originalCitations)
})

test("multiple verified Markdown citations retain UTF-16 offsets, bold/list formatting and source numbering", () => {
  const first = "([e-justice.europa.eu](https://e-justice.europa.eu/topics/find-legal-professional_en))"
  const second = `([webgate.ec.europa.eu](${screenshotSourceUrl}))`
  const internal = "[εταιρεία](https://kl1me.github.io/souzana/team/)"
  const content = `### Πηγές\n1. 🌍 **Βρείτε δικηγόρο ${first}**.\n2. ⚖️ Διαβάστε την επίσημη πηγή ${second}.\n3. Η ομάδα μας ${internal}.`
  const result = render({ role: "assistant", content,
    sources: [
      { id: "webgate", title: "Ευρωπαϊκή πηγή", url: screenshotSourceUrl },
      { id: "ejustice", title: "Εύρεση δικηγόρου", url: "https://e-justice.europa.eu/topics/find-legal-professional_en" },
      { id: "team", title: "Η ομάδα μας", url: "https://kl1me.github.io/souzana/team/" },
    ],
    citations: [first, second, internal].map((text, index) => ({ start: content.indexOf(text), end: content.indexOf(text) + text.length, sourceIndex: [1, 0, 2][index] })),
  })
  assert.match(result, /<p class="font-semibold">Πηγές<\/p>/)
  assert.match(result, /<li>🌍 <strong[^>]*>Βρείτε δικηγόρο <a/)
  assert.deepEqual([...result.matchAll(/<a\b[^>]*>(.*?)<\/a>/g)].map((match) => match[1]), ["[2]", "[1]", "[3]"])
  assert.match(result, /href="\/team\/?">\[3\]<\/a>/)
  assert.equal((result.match(/<li>/g) ?? []).length, 3)
})

test("bare URL citation labels are compact but punctuation outside the range is retained", () => {
  const url = "https://www.gov.gr/service"
  const content = `Δείτε την υπηρεσία (${url}).`
  const result = render({ role: "assistant", content, sources: [{ id: "gov", title: "Υπηρεσία", url }],
    citations: [{ start: content.indexOf(url), end: content.indexOf(url) + url.length, sourceIndex: 0 }],
  })
  assert.match(result, /Δείτε την υπηρεσία \(<a[^>]*>\[1\]<\/a>\)\./)
})

test("uncited Markdown destinations never become links, even beside a verified source", () => {
  const content = "[μη επαληθευμένη πηγή](https://attacker.test/) και [αυθαίρετο](javascript:alert(1)). Πηγές: [1]"
  const result = render({ role: "assistant", content,
    sources: [{ id: "gov", title: "Επίσημη πηγή", url: "https://www.gov.gr/service" }],
    citations: [{ start: content.indexOf("[1]"), end: content.length, sourceIndex: 0 }],
  })
  assert.ok(result.includes("[μη επαληθευμένη πηγή](https://attacker.test/)"))
  assert.ok(result.includes("[αυθαίρετο](javascript:alert(1))"))
  assert.equal((result.match(/<a /g) ?? []).length, 1)
  assert.doesNotMatch(result, /href="(?:https:\/\/attacker|javascript:)/)
})

test("citation ranges containing a claim keep their full text rather than dropping its meaning", () => {
  const content = "Η διαδικασία απαιτεί δικαιολογητικά (https://www.gov.gr/service)."
  const result = render({ role: "assistant", content,
    sources: [{ id: "gov", title: "Επίσημη πηγή", url: "https://www.gov.gr/service" }],
    citations: [{ start: 0, end: content.length, sourceIndex: 0 }],
  })
  assert.ok(result.includes(`>${content}</a>`))
})

test("a compact citation uses its verified source href rather than a Markdown destination", () => {
  const citation = "([gov.gr](https://attacker.test/incorrect-target))"
  const content = `Δείτε την επίσημη πηγή ${citation}.`
  const result = render({ role: "assistant", content,
    sources: [{ id: "gov", title: "Επίσημη πηγή", url: "https://www.gov.gr/service" }],
    citations: [{ start: content.indexOf(citation), end: content.indexOf(citation) + citation.length, sourceIndex: 0 }],
  })
  assert.match(result, /href="https:\/\/www.gov.gr\/service"[^>]*>\[1\]<\/a>/)
  assert.doesNotMatch(result, /attacker\.test/)
})

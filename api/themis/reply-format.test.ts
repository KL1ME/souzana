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

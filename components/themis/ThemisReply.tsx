import Link from "next/link"
import type { ReactNode } from "react"
import { site } from "@/lib/content"
import { internalThemisSourceHref } from "@/lib/themis-links"
import type { ThemisMessage } from "@/lib/themis"

type Range = { start: number; end: number }
type Block = { kind: "paragraph" | "heading"; ranges: [Range] }
  | { kind: "bullets" | "steps"; ranges: Range[]; first: number }

// Keep every range in the original reply: source citation offsets must not change.
function replyBlocks(content: string): Block[] {
  const blocks: Block[] = []
  let offset = 0
  for (const line of content.split(/\r\n|\n|\r/)) {
    const start = offset
    offset += line.length + (content.slice(offset + line.length).startsWith("\r\n") ? 2 : 1)
    if (!line.trim()) continue
    const bullet = /^(?:[-*•]|(\d+)[.)])\s+(.+)$/.exec(line)
    const heading = /^#{1,3}\s+(.+)$/.exec(line)
    const contactLabel = /^(?:Τηλέφωνα|Τηλέφωνο|Email|E-mail|Διεύθυνση|Phone(?: numbers)?|Telephone(?: numbers)?|Address):?$/iu.test(line.trim())
    const previous = blocks.at(-1)
    if (bullet) {
      const kind = bullet[1] ? "steps" : "bullets"
      const range = { start: start + line.length - bullet[2].length, end: start + line.length }
      if (previous?.kind === kind && content.slice(previous.ranges.at(-1)!.end, start).match(/^(?:\r\n|\n|\r)$/)) {
        previous.ranges.push(range)
      } else blocks.push({ kind, ranges: [range], first: Number(bullet[1] ?? 1) })
    } else if (heading) {
      blocks.push({ kind: "heading", ranges: [{ start: start + line.length - heading[1].length, end: start + line.length }] })
    } else if (contactLabel) {
      blocks.push({ kind: "heading", ranges: [{ start, end: start + line.length }] })
    } else if (previous?.kind === "paragraph" && /^(?:\r\n|\n|\r)$/.test(content.slice(previous.ranges[0].end, start))) {
      previous.ranges[0].end = start + line.length
    } else blocks.push({ kind: "paragraph", ranges: [{ start, end: start + line.length }] })
  }
  return blocks
}

export default function ThemisReply({ message, onInternalSource }: { message: ThemisMessage; onInternalSource: () => void }) {
  function inline(range: Range, bold = true): ReactNode[] {
    const parts: ReactNode[] = []
    let position = range.start
    const markers = bold ? [...message.content.slice(range.start, range.end).matchAll(/\*\*([^*\r\n]+)\*\*/g)] : []
    const citations = (message.citations ?? []).filter((citation) => citation.start >= range.start && citation.end <= range.end)
    const tokens = [
      ...citations.map((citation) => ({ ...citation, kind: "citation" as const })),
      ...markers.map((match) => ({ start: range.start + match.index!, end: range.start + match.index! + match[0].length, kind: "bold" as const })),
    ].sort((a, b) => a.start - b.start)
    for (const token of tokens) {
      if (token.start < position) continue
      if (token.kind === "bold" && citations.some((citation) =>
        citation.start < token.end && citation.end > token.start &&
        (citation.start < token.start + 2 || citation.end > token.end - 2))) continue
      parts.push(message.content.slice(position, token.start))
      if (token.kind === "bold") {
        parts.push(<strong key={`bold:${token.start}`} className="font-semibold">{inline({ start: token.start + 2, end: token.end - 2 }, false)}</strong>)
      } else {
        const source = message.sources?.[token.sourceIndex]
        const text = message.content.slice(token.start, token.end)
        if (!source) parts.push(text)
        else {
          const label = /^\s*(?:\[\d+\]|cite[^]*)\s*$/.test(text) ? `[${token.sourceIndex + 1}]` : text
          const internalHref = internalThemisSourceHref(source.url, site.url)
          const props = {
            title: source.title,
            "aria-label": `Πηγή: ${source.title}`,
            className: "rounded-sm underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          }
          parts.push(internalHref
            ? <Link key={`source:${token.start}`} href={internalHref} onClick={onInternalSource} {...props}>{label}</Link>
            : <a key={`source:${token.start}`} href={source.url} target="_blank" rel="noopener noreferrer" {...props}>{label}</a>)
        }
      }
      position = token.end
    }
    parts.push(message.content.slice(position, range.end))
    return parts
  }

  const blocks = replyBlocks(message.content)
  // Rare citations spanning blocks retain the original text and complete source link.
  if (message.citations?.some((citation) => !blocks.some((block) => block.ranges.some((range) => citation.start >= range.start && citation.end <= range.end)))) {
    return <p className="whitespace-pre-wrap">{inline({ start: 0, end: message.content.length }, false)}</p>
  }
  return <div className="space-y-3">
    {blocks.map((block) => block.kind === "bullets" || block.kind === "steps"
      ? block.kind === "bullets"
        ? <ul key={block.ranges[0].start} className="list-disc space-y-1.5 pl-5">{block.ranges.map((range) => <li key={range.start}>{inline(range)}</li>)}</ul>
        : <ol key={block.ranges[0].start} start={block.first} className="list-decimal space-y-1.5 pl-5">{block.ranges.map((range) => <li key={range.start}>{inline(range)}</li>)}</ol>
      : <p key={block.ranges[0].start} className={block.kind === "heading" ? "font-semibold" : "whitespace-pre-wrap"}>{inline(block.ranges[0])}</p>)}
  </div>
}

import Image from "next/image"
import { ExternalLink, FileText } from "lucide-react"
import Container from "@/components/layout/Container"
import SectionHeader from "@/components/layout/SectionHeader"
import { Card } from "@/components/ui/card"
import { media, pages } from "@/lib/content"
import { formatDate, slugify } from "@/lib/format"
import { createPageMetadata } from "@/lib/metadata"

export const metadata = createPageMetadata(
  pages.media.title,
  pages.media.description,
  "/media"
)

export default function MediaPage() {
  return (
    <div className="pb-16 sm:pb-24">
      <section className="border-b border-border/60 bg-muted py-14 sm:py-20 lg:py-24">
        <Container>
          <SectionHeader
            eyebrow={pages.media.eyebrow}
            title={pages.media.title}
            description={pages.media.description}
            headingLevel="h1"
          />
          <nav aria-label="Κατηγορίες δημοσιεύσεων" className="mt-8 flex flex-wrap gap-3">
            {media.sections.map((section) => (
              <a
                key={section.title}
                href={`#${slugify(section.title)}`}
                className="rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground/80 transition-colors hover:border-accent hover:text-foreground"
              >
                {section.title}
              </a>
            ))}
          </nav>
        </Container>
      </section>
      <section className="py-16 sm:py-24">
        <Container className="space-y-14 sm:space-y-16">
          {media.sections.map((section) => (
            <div key={section.title} id={slugify(section.title)} className="scroll-mt-32 space-y-8">
              <div className="space-y-2">
                <h2 className="font-serif text-2xl font-semibold text-foreground sm:text-3xl">
                  {section.title}
                </h2>
                {section.description ? (
                  <p className="text-sm text-muted-foreground max-w-2xl">
                    {section.description}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                {section.items.map((item) => {
                  const isVideo = item.format === "Βίντεο" || item.format === "Ηχητικό"

                  return (
                    <Card key={item.href} className="gap-0 overflow-hidden p-0 sm:p-0">
                      {item.image ? (
                        <div className={`relative overflow-hidden border-b border-border/60 bg-muted ${isVideo ? "aspect-video" : item.image.fit === "contain" ? "h-80" : "aspect-[16/10]"}`}>
                          <Image
                            src={item.image.src}
                            alt={item.image.alt}
                            fill
                            className={item.image.fit === "contain" ? (isVideo ? "object-contain" : "object-contain p-3") : "object-cover object-[50%_30%]"}
                            style={item.image.position ? { objectPosition: item.image.position } : undefined}
                            sizes="(min-width: 768px) 45vw, 90vw"
                          />
                        </div>
                      ) : null}
                      <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
                        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          <span>{item.outlet}</span>
                          <span>{item.dateLabel ?? (item.date ? formatDate(item.date) : null)}</span>
                        </div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                          {item.format}
                        </p>
                        <h3 className="text-lg font-semibold text-foreground font-serif">
                          <a
                            href={item.href}
                            target="_blank"
                            rel="noreferrer"
                            className="underline decoration-transparent underline-offset-4 transition-colors hover:decoration-accent focus-visible:decoration-accent"
                          >
                            {item.title}
                          </a>
                        </h3>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-auto inline-flex items-center gap-2 pt-4 text-sm font-semibold text-foreground underline decoration-accent/60 underline-offset-4 transition-colors hover:decoration-accent"
                        >
                          {item.linkLabel ?? "Άνοιγμα"}
                          {item.href.endsWith(".pdf") ? <FileText className="size-4 shrink-0" aria-hidden="true" /> : <ExternalLink className="size-4 shrink-0" aria-hidden="true" />}
                        </a>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">{pages.media.note}</p>
        </Container>
      </section>
    </div>
  )
}

import Link from "next/link"
import { ExternalLink } from "lucide-react"
import Container from "@/components/layout/Container"
import SectionHeader from "@/components/layout/SectionHeader"
import { Card } from "@/components/ui/card"
import { media, pages } from "@/lib/content"
import { formatDate } from "@/lib/format"
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
        </Container>
      </section>
      <section className="py-16 sm:py-24">
        <Container className="space-y-14 sm:space-y-16">
          {media.sections.map((section) => (
            <div key={section.title} className="space-y-8">
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
                {section.items.map((item) => (
                  <Card key={item.href} className="gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      <span>{item.outlet}</span>
                      <span>{formatDate(item.date)}</span>
                    </div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      {item.format}
                    </p>
                    <h3 className="text-lg font-semibold text-foreground font-serif">
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                    <Link
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-foreground underline decoration-accent/60 underline-offset-4 transition-colors hover:decoration-accent"
                    >
                      Άνοιγμα
                      <ExternalLink className="size-4" aria-hidden="true" />
                    </Link>
                  </Card>
                ))}
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">{pages.media.note}</p>
        </Container>
      </section>
    </div>
  )
}

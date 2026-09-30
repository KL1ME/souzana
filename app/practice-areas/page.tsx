import Link from "next/link"
import Container from "@/components/layout/Container"
import SectionHeader from "@/components/layout/SectionHeader"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { pages, practiceAreas, site } from "@/lib/content"
import { iconMap } from "@/lib/icons"
import { createPageMetadata } from "@/lib/metadata"

export const metadata = createPageMetadata(
  pages.practice.title,
  pages.practice.description,
  "/practice-areas"
)

export default function PracticeAreasPage() {
  return (
    <div className="pb-16 sm:pb-24">
      <section className="border-b border-accent/20 bg-muted/40 py-14 sm:py-20 lg:py-24">
        <Container>
          <SectionHeader
            eyebrow={pages.practice.eyebrow}
            title={pages.practice.title}
            description={pages.practice.description}
            headingLevel="h1"
          />
          <div className="mt-8 max-w-3xl space-y-4 text-base leading-relaxed text-muted-foreground">
            {pages.practice.intro.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </Container>
      </section>
      <section className="py-16 sm:py-24">
        <Container className="space-y-12">
          <nav aria-label="Μετάβαση σε τομέα εξειδίκευσης">
            <ul className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {practiceAreas.map((area, index) => (
                <li key={area.slug}>
                  <a
                    href={`#${area.slug}`}
                    className="flex h-full items-center gap-3 rounded-xl border border-border/70 px-4 py-3 text-foreground/80 transition-colors hover:border-accent/70 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <span className="font-serif text-lg text-accent" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>{area.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="space-y-6">
            {practiceAreas.map((area, index) => {
              const Icon = iconMap[area.icon]
              return (
                <Card key={area.slug} id={area.slug} className="scroll-mt-24 gap-6 sm:p-8">
                  <h2 className="flex items-center gap-4 font-serif text-2xl font-semibold text-foreground sm:text-3xl">
                    <span className="inline-flex size-10 items-center justify-center rounded-full border border-border/50 bg-muted">
                      <Icon className="size-4 text-accent" />
                    </span>
                    <span className="text-accent" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>{area.title}</span>
                  </h2>
                  <div className={area.bullets.length ? "grid gap-6 lg:grid-cols-2 lg:gap-10" : "max-w-4xl"}>
                    <div className="space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
                      {area.details.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                    {area.bullets.length ? (
                      <div>
                        <h3 className="mb-4 text-sm font-semibold text-foreground">
                          {area.slug === "criminal-law" ? "Ενδεικτικά αναλαμβάνουμε υποθέσεις που αφορούν" : "Ενδεικτικά αναλαμβάνουμε"}
                        </h3>
                        <ul className="space-y-2 text-sm leading-relaxed text-foreground/80">
                          {area.bullets.map((bullet) => (
                            <li key={bullet} className="flex items-start gap-2">
                              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </Card>
              )
            })}
          </div>
        </Container>
      </section>
      <section className="py-8 sm:py-16">
        <Container className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-border/60 bg-card p-6 sm:p-10 md:flex-row md:items-center">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {site.city}
            </p>
            <h2 className="text-2xl font-semibold font-serif">
              {pages.practice.ctaTitle}
            </h2>
            <p className="text-sm text-muted-foreground">
              {pages.practice.ctaDescription}
            </p>
          </div>
          <Button asChild size="lg" className="w-full md:w-auto">
            <Link href={pages.practice.ctaHref}>{pages.practice.ctaLabel}</Link>
          </Button>
        </Container>
      </section>
    </div>
  )
}

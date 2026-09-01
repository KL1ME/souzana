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
        </Container>
      </section>
      <section className="py-16 sm:py-24">
        <Container>
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            {practiceAreas.map((area) => {
              const Icon = iconMap[area.icon]
              return (
                <Card key={area.slug} className="gap-6">
                  <h2 className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    <span className="inline-flex size-10 items-center justify-center rounded-full border border-border/50 bg-muted">
                      <Icon className="size-4 text-accent" />
                    </span>
                    {area.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {area.shortDescription}
                  </p>
                  <ul className="space-y-2 text-sm text-foreground/80">
                    {area.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2">
                        <span className="mt-1 size-1.5 rounded-full bg-accent" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
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

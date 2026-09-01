import Image from "next/image"
import Link from "next/link"
import Container from "@/components/layout/Container"
import SectionHeader from "@/components/layout/SectionHeader"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { home, practiceAreas } from "@/lib/content"
import { iconMap } from "@/lib/icons"

export default function PracticeAreasPreview() {
  return (
    <section className="py-16 sm:py-24 lg:py-28">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="space-y-8 sm:space-y-10">
            <SectionHeader
              eyebrow={home.practicePreview.eyebrow}
              title={home.practicePreview.title}
              description={home.practicePreview.description}
            />
            <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
              {practiceAreas.slice(0, 4).map((area, index) => {
                const Icon = iconMap[area.icon]
                return (
                  <Card
                    key={area.slug}
                    className={index === 3 ? "hidden transition-colors md:flex" : "transition-colors"}
                  >
                    <h3 className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      <span className="inline-flex size-9 items-center justify-center rounded-full border border-border/50 bg-muted">
                        <Icon className="size-4 text-accent" />
                      </span>
                      {area.title}
                    </h3>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        {area.shortDescription}
                      </p>
                      <ul className="space-y-2 text-sm text-foreground/80">
                        {area.bullets.slice(0, 2).map((bullet) => (
                          <li key={bullet} className="flex items-start gap-2">
                            <span className="mt-1 size-1.5 rounded-full bg-accent" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
            <Button asChild variant="outline" className="h-12 w-full sm:w-auto">
              <Link href={home.practicePreview.ctaHref}>
                {home.practicePreview.ctaLabel}
              </Link>
            </Button>
          </div>
          <div className="hidden lg:block">
            <div className="relative aspect-video overflow-hidden rounded-3xl border border-border/50">
              <Image
                src={home.practicePreview.image.src}
                alt={home.practicePreview.image.alt}
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 32vw, 90vw"
              />
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}

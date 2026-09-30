import Link from "next/link"
import Container from "@/components/layout/Container"
import SectionHeader from "@/components/layout/SectionHeader"
import { home, practiceAreas } from "@/lib/content"

export default function PracticeAreasPreview() {
  return (
    <section className="border-t border-border py-20 sm:py-28 lg:py-32">
      <Container className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
        <div className="lg:pr-10">
          <SectionHeader
            eyebrow={home.practicePreview.eyebrow}
            title={home.practicePreview.title}
            description={home.practicePreview.description}
          />
        </div>
        <div>
          <ol className="border-t border-border">
            {practiceAreas.slice(0, 5).map((area, index) => (
              <li key={area.slug} className="border-b border-border">
                <Link
                  href={`/practice-areas/#${area.slug}`}
                  className="group grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 gap-y-2 py-6 text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:py-8"
                >
                  <span className="font-serif text-xl text-accent" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <span className="block font-serif text-2xl leading-tight transition-colors group-hover:text-accent sm:text-3xl">
                      {area.title}
                    </span>
                    <span className="mt-2 block max-w-xl text-sm leading-relaxed text-muted-foreground">
                      {area.shortDescription}
                    </span>
                  </span>
                  <span className="hidden text-xl text-accent transition-transform group-hover:translate-x-1 sm:block" aria-hidden="true">↗</span>
                </Link>
              </li>
            ))}
          </ol>
          <Link
            href={home.practicePreview.ctaHref}
            className="mt-8 inline-flex items-center gap-4 border-b border-accent pb-2 text-sm font-semibold text-foreground transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {home.practicePreview.ctaLabel}<span aria-hidden="true">↗</span>
          </Link>
        </div>
      </Container>
    </section>
  )
}

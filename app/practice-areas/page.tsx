import Link from "next/link"
import Container from "@/components/layout/Container"
import { pages, practiceAreas, site } from "@/lib/content"
import { createPageMetadata } from "@/lib/metadata"

export const metadata = createPageMetadata(
  pages.practice.title,
  pages.practice.description,
  "/practice-areas"
)

export default function PracticeAreasPage() {
  return (
    <div>
      <header className="border-b border-border py-20 sm:py-28 lg:py-36">
        <Container className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <p className="mb-8 text-xs font-medium uppercase tracking-[0.28em] text-accent">
              {pages.practice.eyebrow}
            </p>
            <h1 className="max-w-lg font-serif text-5xl leading-[0.98] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              {pages.practice.title}
            </h1>
          </div>
          <div className="max-w-2xl space-y-6 border-l border-accent/60 pl-6 sm:pl-9">
            <p className="text-lg leading-relaxed text-foreground sm:text-xl">
              {pages.practice.description}
            </p>
            {pages.practice.intro.map((paragraph) => (
              <p key={paragraph} className="text-base leading-relaxed text-muted-foreground">
                {paragraph}
              </p>
            ))}
          </div>
        </Container>
      </header>

      <section className="border-b border-border py-14 sm:py-20" aria-labelledby="practice-index-title">
        <Container className="grid gap-8 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-12">
          <h2 id="practice-index-title" className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
            Περιεχόμενα
          </h2>
          <nav aria-label="Μετάβαση σε τομέα εξειδίκευσης">
            <ol className="grid gap-x-10 sm:grid-cols-2">
              {practiceAreas.map((area, index) => (
                <li key={area.slug} className="border-t border-border">
                  <a
                    href={`#${area.slug}`}
                    className="group flex min-h-16 items-start gap-4 py-4 text-foreground transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <span className="w-7 shrink-0 font-serif text-lg text-accent" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="flex-1 text-sm leading-snug sm:text-base">{area.title}</span>
                    <span className="text-lg leading-none text-accent transition-transform group-hover:translate-x-1" aria-hidden="true">↗</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </Container>
      </section>

      <section id="practice-content" aria-label="Αναλυτικοί τομείς εξειδίκευσης">
        <Container>
          {practiceAreas.map((area, index) => (
            <article
              key={area.slug}
              id={area.slug}
              className="grid scroll-mt-24 gap-8 border-b border-border py-16 sm:py-20 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-12 lg:py-24"
            >
              <span className="font-serif text-5xl leading-none text-accent/70 sm:text-6xl" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="max-w-4xl">
                <h2 className="max-w-3xl font-serif text-3xl leading-tight text-foreground sm:text-4xl">
                  {area.title}
                </h2>
                <div className="mt-8 max-w-3xl space-y-5 text-base leading-[1.8] text-muted-foreground">
                  {area.details.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                {area.bullets.length > 0 && (
                  <div className="mt-10 border-t border-border pt-8">
                    <h3 className="mb-6 text-xs font-semibold uppercase tracking-[0.18em] text-foreground">
                      {area.slug === "criminal-law"
                        ? "Ενδεικτικά αναλαμβάνουμε υποθέσεις που αφορούν"
                        : "Ενδεικτικά αναλαμβάνουμε"}
                    </h3>
                    <ul className="grid gap-x-10 gap-y-3 sm:grid-cols-2">
                      {area.bullets.map((bullet) => (
                        <li key={bullet} className="flex gap-3 text-sm leading-relaxed text-foreground/80">
                          <span className="mt-[0.65em] h-px w-3 shrink-0 bg-accent" aria-hidden="true" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </article>
          ))}
        </Container>
      </section>

      <section className="py-16 sm:py-24">
        <Container className="grid gap-8 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-12">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
            {site.city}
          </p>
          <div className="max-w-3xl">
            <h2 className="font-serif text-3xl text-foreground sm:text-4xl">
              {pages.practice.ctaTitle}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              {pages.practice.ctaDescription}
            </p>
            <Link
              href={pages.practice.ctaHref}
              className="mt-8 inline-flex items-center gap-4 border-b border-accent pb-2 text-sm font-semibold text-foreground transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {pages.practice.ctaLabel}<span aria-hidden="true">↗</span>
            </Link>
          </div>
        </Container>
      </section>
    </div>
  )
}

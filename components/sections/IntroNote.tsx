import Link from "next/link"
import Container from "@/components/layout/Container"
import SectionHeader from "@/components/layout/SectionHeader"
import { home } from "@/lib/content"

export default function IntroNote() {
  return (
    <section className="py-20 sm:py-28 lg:py-32">
      <Container className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
        <SectionHeader eyebrow={home.intro.eyebrow} title={home.intro.title} />
        <div className="max-w-3xl">
          <div className="space-y-6 text-base leading-[1.8] text-muted-foreground">
            {home.intro.paragraphs.slice(0, 3).map((paragraph, index) => (
              <p key={paragraph} className={index === 0 ? "text-lg text-foreground" : undefined}>
                {paragraph}
              </p>
            ))}
          </div>
          <div className="mt-10 space-y-5 border-t border-border pt-8 text-base leading-[1.8] text-muted-foreground">
            {home.intro.paragraphs.slice(3).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <Link
            href="/practice-areas"
            className="mt-8 inline-flex items-center gap-4 border-b border-accent pb-2 text-sm font-semibold text-foreground transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Δείτε τους τομείς εξειδίκευσης<span aria-hidden="true">↗</span>
          </Link>
        </div>
      </Container>
    </section>
  )
}

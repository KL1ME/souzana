import Link from "next/link"
import Container from "@/components/layout/Container"
import SectionHeader from "@/components/layout/SectionHeader"
import { home } from "@/lib/content"

export default function IntroNote() {
  return (
    <section className="py-16 sm:py-24 lg:py-28">
      <Container className="space-y-8">
        <SectionHeader
          eyebrow={home.intro.eyebrow}
          title={home.intro.title}
        />
        <div className="max-w-4xl space-y-5 text-base leading-relaxed text-foreground/80">
          {home.intro.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <Link
          href="/practice-areas"
          className="inline-flex text-sm font-semibold text-foreground underline decoration-accent/60 underline-offset-4 transition-colors hover:decoration-accent"
        >
          Δείτε τους τομείς εξειδίκευσης
        </Link>
      </Container>
    </section>
  )
}

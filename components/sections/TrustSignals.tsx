import Container from "@/components/layout/Container"
import SectionHeader from "@/components/layout/SectionHeader"
import { home } from "@/lib/content"
import Link from "next/link"

export default function TrustSignals() {
  return (
    <section className="bg-muted/40 py-16 sm:py-24 lg:py-28">
      <Container>
        <div className="space-y-8 sm:space-y-12">
          <SectionHeader
            eyebrow={home.trust.eyebrow}
            title={home.trust.title}
            description={home.trust.description}
          />
          <ol className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3 md:gap-6">
            {home.trust.bullets.map((bullet, index) => (
              <li key={bullet} className="flex items-start gap-4 rounded-2xl border border-border/70 bg-background/70 p-5">
                <span className="font-serif text-xl text-accent" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="leading-relaxed">{bullet}</span>
              </li>
            ))}
          </ol>
          <Link
            href={home.trust.ctaHref}
            className="inline-flex text-sm font-semibold text-foreground underline decoration-accent/60 underline-offset-4 transition-colors hover:decoration-accent"
          >
            {home.trust.ctaLabel}
          </Link>
        </div>
      </Container>
    </section>
  )
}

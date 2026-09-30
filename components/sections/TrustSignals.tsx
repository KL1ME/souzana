import Link from "next/link"
import Container from "@/components/layout/Container"
import { home } from "@/lib/content"

export default function TrustSignals() {
  return (
    <section className="bg-foreground py-20 text-background sm:py-28 lg:py-32">
      <Container>
        <div className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-accent">
            {home.trust.eyebrow}
          </p>
          <h2 className="mt-6 font-serif text-4xl leading-tight sm:text-5xl">
            {home.trust.title}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-background/70">
            {home.trust.description}
          </p>
        </div>
        <ol className="mt-14 grid gap-8 md:grid-cols-3 md:gap-10">
          {home.trust.bullets.map((bullet, index) => (
            <li key={bullet} className="border-t border-background/25 pt-6">
              <span className="font-serif text-3xl text-accent" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="mt-5 max-w-sm text-base leading-relaxed text-background/85">
                {bullet}
              </p>
            </li>
          ))}
        </ol>
        <Link
          href={home.trust.ctaHref}
          className="mt-12 inline-flex items-center gap-4 border-b border-accent pb-2 text-sm font-semibold text-background transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {home.trust.ctaLabel}<span aria-hidden="true">↗</span>
        </Link>
      </Container>
    </section>
  )
}

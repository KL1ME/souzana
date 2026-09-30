import Link from "next/link"
import Container from "@/components/layout/Container"
import SectionHeader from "@/components/layout/SectionHeader"
import { home } from "@/lib/content"

export default function FinalCTA() {
  return (
    <section className="border-t border-border py-20 sm:py-28 lg:py-32">
      <Container className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-16">
        <SectionHeader
          eyebrow="Επικοινωνία"
          title={home.finalCta.title}
          description={home.finalCta.description}
        />
        <Link
          href={home.finalCta.ctaHref}
          className="inline-flex w-fit items-center gap-6 border-b border-accent pb-2 text-sm font-semibold text-foreground transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {home.finalCta.ctaLabel}<span aria-hidden="true">↗</span>
        </Link>
      </Container>
    </section>
  )
}

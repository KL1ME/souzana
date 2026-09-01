import Image from "next/image"
import Link from "next/link"
import Container from "@/components/layout/Container"
import { Button } from "@/components/ui/button"
import { home } from "@/lib/content"

export default function Hero() {
  return (
    <section className="border-b border-accent/20 bg-background">
      <Container className="py-14 sm:py-20 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-14">
          <div className="space-y-7 sm:space-y-8">
            <div className="space-y-4">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.4em] text-muted-foreground">
                {home.hero.eyebrow}
              </p>
              <div className="hairline-gold w-28" />
            </div>
            <h1 className="font-serif text-[2.5rem] font-semibold leading-[1.04] tracking-[0.01em] text-foreground sm:text-5xl lg:text-6xl">
              {home.hero.title}
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {home.hero.subtitle}
            </p>
            <div className="grid gap-3 sm:flex sm:flex-wrap sm:gap-4">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href={home.hero.primaryCta.href}>
                  {home.hero.primaryCta.label}
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                <Link href={home.hero.secondaryCta.href}>
                  {home.hero.secondaryCta.label}
                </Link>
              </Button>
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              {home.hero.trustLine}
            </p>
          </div>
          <div className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border/50 sm:aspect-[3/2] sm:rounded-3xl">
              <Image
                src={home.hero.image.src}
                alt={home.hero.image.alt}
                fill
                priority
                className="object-cover"
                sizes="(min-width: 1024px) 40vw, 90vw"
              />
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}

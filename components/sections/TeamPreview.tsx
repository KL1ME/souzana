import Image from "next/image"
import Link from "next/link"
import Container from "@/components/layout/Container"
import SectionHeader from "@/components/layout/SectionHeader"
import { Button } from "@/components/ui/button"
import { home, teamMembers, pages } from "@/lib/content"

export default function TeamPreview() {
  const profile = pages.team.profile

  return (
    <section className="border-t border-border/60 py-16 sm:py-24 lg:py-28">
      <Container className="space-y-8 sm:space-y-12">
        <SectionHeader
          eyebrow={home.teamPreview.eyebrow}
          title={home.teamPreview.title}
          description={home.teamPreview.description}
        />
        <div className="scrollbar-none -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
          <Link href="/team" className="group block min-w-[76vw] snap-start space-y-4 sm:min-w-0">
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-border/50 transition-shadow group-hover:shadow-md">
              <Image
                src={profile.image.src}
                alt={profile.image.alt}
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 90vw"
              />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                {profile.title}
              </h3>
              <p className="text-sm text-muted-foreground">{profile.role}</p>
            </div>
          </Link>
          {teamMembers.slice(0, 3).map((member) => (
            <Link key={member.name} href="/team" className="group block min-w-[76vw] snap-start space-y-4 sm:min-w-0">
              {member.image ? (
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-border/50 transition-shadow group-hover:shadow-md">
                  <Image
                    src={member.image.src}
                    alt={member.image.alt}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 90vw"
                  />
                </div>
              ) : (
                <div className="flex aspect-[4/5] items-center justify-center rounded-2xl border border-border/50 bg-muted transition-shadow group-hover:shadow-md">
                  <span className="font-serif text-3xl tracking-[0.2em] text-foreground">
                    {member.initials}
                  </span>
                </div>
              )}
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  {member.name}
                </h3>
                <p className="text-sm text-muted-foreground">{member.title}</p>
              </div>
            </Link>
          ))}
        </div>
        <Button asChild variant="outline" className="h-12 w-full sm:w-auto">
          <Link href={home.teamPreview.ctaHref}>
            {home.teamPreview.ctaLabel}
          </Link>
        </Button>
      </Container>
    </section>
  )
}

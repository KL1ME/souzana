import Image from "next/image"
import Link from "next/link"
import Container from "@/components/layout/Container"
import SectionHeader from "@/components/layout/SectionHeader"
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
            <div className="relative aspect-[4/5] overflow-hidden bg-muted">
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
                <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                  <Image
                    src={member.image.src}
                    alt={member.image.alt}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 90vw"
                  />
                </div>
              ) : (
                <div className="flex aspect-[4/5] items-center justify-center bg-muted">
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
        <Link
          href={home.teamPreview.ctaHref}
          className="inline-flex w-fit items-center gap-4 border-b border-accent pb-2 text-sm font-semibold text-foreground transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {home.teamPreview.ctaLabel}<span aria-hidden="true">↗</span>
        </Link>
      </Container>
    </section>
  )
}

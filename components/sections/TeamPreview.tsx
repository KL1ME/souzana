import Link from "next/link"
import Container from "@/components/layout/Container"
import SectionHeader from "@/components/layout/SectionHeader"
import { home } from "@/lib/content"
import { directoryMembers, memberPath } from "@/lib/team-directory"
import TeamPortrait from "@/components/team/TeamPortrait"

export default function TeamPreview() {
  return (
    <section className="border-t border-border/60 py-16 sm:py-24 lg:py-28">
      <Container className="space-y-8 sm:space-y-12">
        <SectionHeader
          eyebrow={home.teamPreview.eyebrow}
          title={home.teamPreview.title}
          description={home.teamPreview.description}
        />
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-6 lg:grid-cols-4">
          {directoryMembers.slice(0, 4).map((member) => (
            <Link key={member.id} href={memberPath(member.id)} className="team-home-person group block min-w-0 space-y-4">
              <TeamPortrait member={member} sizes="(min-width: 1200px) 270px, (min-width: 1024px) 25vw, 50vw" />
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  {member.name}
                </h3>
                {member.role && <p className="text-sm text-muted-foreground">{member.role}</p>}
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

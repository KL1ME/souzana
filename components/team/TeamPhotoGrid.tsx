import Link from "next/link"
import Container from "@/components/layout/Container"
import TeamPortrait from "@/components/team/TeamPortrait"
import { directoryMembers, memberPath } from "@/lib/team-directory"
import type { BiographyVersion } from "@/lib/team-biographies"

export default function TeamPhotoGrid({ version }: { version?: BiographyVersion }) {
  return (
    <section className="team-photo-page">
      <Container>
        <h1>Η ομάδα μας</h1>
        <div className="team-photo-grid">
          {directoryMembers.map((member, index) => (
            <Link key={member.id} href={memberPath(member.id, version)} className="team-photo-tile"
              aria-label={member.versions["1"].length ? `${member.name} · Δείτε το βιογραφικό` : member.name}>
              <TeamPortrait member={member} priority={index === 0}
                sizes="(min-width: 1200px) 224px, (min-width: 768px) 25vw, (min-width: 480px) 33vw, 50vw" />
              <span className="team-photo-name" aria-hidden="true">{member.name}</span>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  )
}

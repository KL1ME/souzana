import Link from "next/link"
import Container from "@/components/layout/Container"
import TeamPortrait from "@/components/team/TeamPortrait"
import { directoryMembers, memberPath } from "@/lib/team-directory"

export default function TeamPhotoGrid() {
  return (
    <section className="team-photo-page">
      <Container>
        <h1>Η ομάδα μας</h1>
        <div className="team-photo-grid">
          {directoryMembers.map((member, index) => (
            <Link key={member.id} href={memberPath(member.id)} className="team-photo-tile"
              aria-label={`${member.name} · Δείτε το βιογραφικό`}>
              <TeamPortrait member={member} priority={index === 0}
                sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw" />
              <span className="team-photo-name" aria-hidden="true">{member.name}</span>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  )
}

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
              aria-label={[member.name, member.role, member.roleNeedsConfirmation ? "Η ιδιότητα αναμένει επιβεβαίωση" : "", member.versions["1"].length ? "Δείτε το βιογραφικό" : ""].filter(Boolean).join(" · ")}>
              <TeamPortrait member={member} priority={index === 0} gallery
                sizes="(min-width: 1200px) 280px, (min-width: 640px) 33vw, 50vw" />
              <span className="team-photo-caption" aria-hidden="true">
                <span className="team-photo-name">{member.name}</span>
                {member.role && <span className="team-photo-role">{member.role}</span>}
                {member.roleNeedsConfirmation && <span className="team-photo-pending">Η ιδιότητα αναμένει επιβεβαίωση</span>}
              </span>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  )
}

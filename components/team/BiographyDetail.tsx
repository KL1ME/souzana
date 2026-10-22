import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import Container from "@/components/layout/Container"
import TeamPortrait from "@/components/team/TeamPortrait"
import { directoryCategories, directoryMembers, directoryPath, memberPath } from "@/lib/team-directory"
import type { BiographyVersion } from "@/lib/team-biographies"

export default function BiographyDetail({ id, version }: { id: string; version?: BiographyVersion }) {
  const member = directoryMembers.find((person) => person.id === id)
  if (!member) notFound()
  const selectedVersion = version ?? "1"
  const hasBiography = member.versions[selectedVersion].length > 0

  return (
    <div className="team-profile-page">
      <Container>
        <Link className="team-back-link" href={directoryPath(version)}><ArrowLeft size={16} aria-hidden="true" /> Πίσω στην ομάδα μας</Link>
        <div className="team-profile-layout">
          <aside className="team-profile-identity">
            <TeamPortrait member={member} priority />
          </aside>
          <article className="team-biography" aria-labelledby="biography-title">
            <header className="team-biography-header">
              {member.category && <p className="team-eyebrow">{directoryCategories.find((item) => item.id === member.category)?.label}</p>}
              <h1 id="biography-title">{member.name}</h1>
              {member.role && <p className="team-profile-role">{member.role}</p>}
              {member.roleNeedsConfirmation && <p className="team-pending">Τίτλος θέσης προς επιβεβαίωση</p>}
            </header>
            {hasBiography && (
              <>
                <nav className="team-biography-versions" aria-label="Μορφή βιογραφικού">
                  <Link href={memberPath(member.id, "1")} aria-current={selectedVersion === "1" ? "page" : undefined}>1η εκδοχή · Κείμενο</Link>
                  <Link href={memberPath(member.id, "2")} aria-current={selectedVersion === "2" ? "page" : undefined}>2η εκδοχή · Λίστες</Link>
                </nav>
                {!member.hasTwoVersions && <p className="team-common-text">Το βιογραφικό αυτό είναι κοινό και στις δύο εκδοχές.</p>}
                <div className="team-biography-copy">
                  {member.versions[selectedVersion].map((block, index) => block.type === "paragraph"
                    ? <p key={index}>{block.text}</p>
                    : <ul key={index}>{block.items.map((item) => <li key={item}>{item}</li>)}</ul>)}
                </div>
              </>
            )}
            <Link className="team-back-link team-back-bottom" href={directoryPath(version)}><ArrowLeft size={16} aria-hidden="true" /> Επιστροφή σε όλη την ομάδα</Link>
          </article>
        </div>
      </Container>
    </div>
  )
}

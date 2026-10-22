import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ArrowUpRight } from "lucide-react"
import Container from "@/components/layout/Container"
import TeamPortrait from "@/components/team/TeamPortrait"
import { pages } from "@/lib/content"
import { directoryCategories, directoryMembers, directoryPath, memberPath } from "@/lib/team-directory"
import type { BiographyVersion } from "@/lib/team-biographies"

export default function BiographyDetail({ id, version }: { id: string; version?: BiographyVersion }) {
  const member = directoryMembers.find((person) => person.id === id)
  if (!member) notFound()
  const selectedVersion = version ?? "1"
  const profile = member.id === "souzana-klimentidi" ? pages.team.profile : undefined

  return (
    <div className="team-profile-page">
      <Container>
        <Link className="team-back-link" href={directoryPath(version)}><ArrowLeft size={16} aria-hidden="true" /> Πίσω στην ομάδα μας</Link>
        <div className="team-profile-layout">
          <aside className="team-profile-identity">
            <TeamPortrait member={member} priority />
            {profile?.links.map((link) => <Link key={link.href} href={link.href} target="_blank" rel="noreferrer" className="team-profile-external">{link.label}<ArrowUpRight size={16} aria-hidden="true" /></Link>)}
          </aside>
          <article className="team-biography" aria-labelledby="biography-title">
            <header className="team-biography-header">
              <p className="team-eyebrow">{directoryCategories.find((item) => item.id === member.category)?.label}</p>
              <h1 id="biography-title">{member.name}</h1>
              <p className="team-profile-role">{member.role}</p>
              {member.roleNeedsConfirmation && <p className="team-pending">Τίτλος θέσης προς επιβεβαίωση</p>}
            </header>
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
            {profile && (
              <div className="team-partner-details">
                <section><h2>Με μια ματιά</h2><ul>{profile.summary.map((text) => <li key={text}>{text}</li>)}</ul></section>
                <section><h2>Επαγγελματική εμπειρία</h2>{profile.experience.map((item) => <div className="team-career-item" key={item.title}><h3>{item.title}</h3><p className="team-career-period">{item.period}</p><ul>{item.details.map((text) => <li key={text}>{text}</li>)}</ul></div>)}</section>
                <section><h2>Εκπαίδευση</h2>{profile.education.map((item) => <div className="team-career-item" key={item.title}><h3>{item.title}</h3><p className="team-career-period">{item.period}</p><ul>{item.details.map((text) => <li key={text}>{text}</li>)}</ul></div>)}</section>
                <section><h2>Γλώσσες</h2><p>{profile.languages.join(" · ")}</p></section>
                <section><h2>Εξειδίκευση</h2><p>{profile.skills.join(" · ")}</p></section>
                {profile.awards?.map((award) => <section key={award.href}><h2>Διακρίσεις</h2><h3>{award.title} · {award.year}</h3><p>{award.category}</p><Link href={award.href} target="_blank" rel="noreferrer" className="team-profile-external">Η διάκριση στον επίσημο διοργανωτή<ArrowUpRight size={16} aria-hidden="true" /></Link></section>)}
              </div>
            )}
            <Link className="team-back-link team-back-bottom" href={directoryPath(version)}><ArrowLeft size={16} aria-hidden="true" /> Επιστροφή σε όλη την ομάδα</Link>
          </article>
        </div>
      </Container>
    </div>
  )
}

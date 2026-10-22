"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowRight, Search } from "lucide-react"
import Container from "@/components/layout/Container"
import TeamPortrait from "@/components/team/TeamPortrait"
import { directoryCategories, directoryMembers, memberPath } from "@/lib/team-directory"
import type { BiographyVersion } from "@/lib/team-biographies"

function normalize(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("el")
}

export default function BiographyPreview({ version = "1", preview = true }: {
  version?: BiographyVersion
  preview?: boolean
}) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<string>("all")
  const members = directoryMembers.filter((member) =>
    (category === "all" || member.category === category) &&
    normalize(`${member.name} ${member.role}`).includes(normalize(query.trim()))
  )

  return (
    <div className="team-directory-page">
      <section className="team-directory-hero">
        <Container>
          <p className="team-eyebrow">ΠΡΟΣΩΠΑ</p>
          <h1>Η ομάδα μας</h1>
          <p className="team-directory-intro">Γνωρίστε τους ανθρώπους της εταιρείας μας και διαβάστε το βιογραφικό τους.</p>
          <div className="team-version-bar">
            <p>{preview ? `Προεπισκόπηση · ${version}η εκδοχή βιογραφικών` : "Δύο μορφές βιογραφικών προς επιλογή"}</p>
            <nav aria-label="Εκδοχή βιογραφικών">
              <Link href="/team/version-1" aria-current={preview && version === "1" ? "page" : undefined}>1η · Κείμενο</Link>
              <Link href="/team/version-2" aria-current={preview && version === "2" ? "page" : undefined}>2η · Λίστες</Link>
            </nav>
          </div>
        </Container>
      </section>
      <Container className="team-directory-content">
        <div className="team-directory-tools">
          <div className="team-categories" role="group" aria-label="Κατηγορία ομάδας">
            {directoryCategories.map((item) => (
              <button key={item.id} type="button" aria-pressed={category === item.id}
                onClick={() => setCategory(item.id)}>
                {item.label}
                <span>{item.id === "all" ? directoryMembers.length : directoryMembers.filter((m) => m.category === item.id).length}</span>
              </button>
            ))}
          </div>
          <label className="team-search">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Αναζήτηση με όνομα ή ιδιότητα</span>
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Όνομα ή ιδιότητα…" />
          </label>
        </div>
        <p className="team-results" role="status">{members.length} από {directoryMembers.length} πρόσωπα</p>
        <div className="team-roster">
          {members.map((member, index) => (
            <Link key={member.id} href={memberPath(member.id, preview ? version : undefined)} className="team-person" id={member.id} data-member-id={member.id}>
              <TeamPortrait member={member} priority={index === 0} />
              <div className="team-person-info">
                {member.category && <p className="team-category-label">{directoryCategories.find((item) => item.id === member.category)?.label}</p>}
                <h2>{member.name}</h2>
                {member.role && <p className="team-person-role">{member.role}</p>}
                <span className="team-read-biography">{member.versions[version].length ? "Δείτε το βιογραφικό" : "Δείτε το προφίλ"} <ArrowRight size={16} aria-hidden="true" /></span>
              </div>
            </Link>
          ))}
        </div>
        {members.length === 0 && (
          <div className="team-empty">
            <h2>Δεν βρέθηκαν βιογραφικά.</h2>
            <p>Δοκιμάστε άλλο όνομα ή κατηγορία.</p>
            <button type="button" onClick={() => { setQuery(""); setCategory("all") }}>Εμφάνιση όλης της ομάδας</button>
          </div>
        )}
      </Container>
    </div>
  )
}

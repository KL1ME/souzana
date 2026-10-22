"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowLeft, ArrowUpRight, Search } from "lucide-react"
import Container from "@/components/layout/Container"
import {
  teamBiographies,
  type BiographyCategory,
  type BiographyVersion,
} from "@/lib/team-biographies"

const categories: { id: "all" | BiographyCategory; label: string }[] = [
  { id: "all", label: "Όλη η ομάδα" },
  { id: "lawyers", label: "Δικηγόροι" },
  { id: "trainees", label: "Ασκούμενοι δικηγόροι" },
  { id: "administration", label: "Διοικητική υποστήριξη" },
]

function normalize(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("el")
}

export default function BiographyPreview({ version }: { version: BiographyVersion }) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<"all" | BiographyCategory>("all")
  const members = teamBiographies.filter((member) =>
    (category === "all" || member.category === category) &&
    normalize(`${member.name} ${member.role}`).includes(normalize(query.trim()))
  )
  const otherVersion = version === "1" ? "2" : "1"

  return (
    <div className="bio-preview">
      <div className="bio-review-bar">
        <Container className="flex flex-wrap items-center justify-between gap-3 py-3">
          <span>Παρουσίαση βιογραφικών · Προεπισκόπηση για επιλογή</span>
          <Link href="/team" className="inline-flex items-center gap-2 underline underline-offset-4">
            <ArrowLeft size={14} aria-hidden="true" /> Κεντρική σελίδα ομάδας
          </Link>
        </Container>
      </div>

      <section className="bio-hero">
        <Container>
          <p className="bio-eyebrow">ΚΛΗΜΕΝΤΙΔΗ & ΤΣΙΛΙΒΑΡΑΚΗ</p>
          <div className="bio-hero-layout">
            <div>
              <h1>Οι άνθρωποί μας.</h1>
              <p className="bio-hero-description">
                Γνωρίστε τους δικηγόρους, τους ασκούμενους και τη διοικητική ομάδα της εταιρείας μας.
              </p>
            </div>
            <div className="bio-version-description">
              <span className="bio-version-number">0{version}</span>
              <div>
                <h2>{version === "1" ? "Αφηγηματική παρουσίαση" : "Παρουσίαση με λίστες"}</h2>
                <p>{version === "1"
                  ? "Τα βιογραφικά σε συνεχόμενο κείμενο."
                  : "Οι τομείς δραστηριότητας σε ευδιάκριτες λίστες."}</p>
              </div>
            </div>
          </div>
          <nav className="bio-version-nav" aria-label="Εκδοχή βιογραφικών">
            <Link href="/team/version-1" aria-current={version === "1" ? "page" : undefined}>
              <span>01</span> 1η εκδοχή · Κείμενο
            </Link>
            <Link href="/team/version-2" aria-current={version === "2" ? "page" : undefined}>
              <span>02</span> 2η εκδοχή · Λίστες
            </Link>
          </nav>
        </Container>
      </section>

      <Container className="bio-content">
        <div className="bio-directory-tools">
          <div className="bio-categories" role="group" aria-label="Κατηγορία ομάδας">
            {categories.map((item) => (
              <button key={item.id} type="button" aria-pressed={category === item.id}
                onClick={() => setCategory(item.id)}>
                {item.label}
                <span>{item.id === "all" ? teamBiographies.length : teamBiographies.filter((m) => m.category === item.id).length}</span>
              </button>
            ))}
          </div>
          <label className="bio-search">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Αναζήτηση με όνομα ή ιδιότητα</span>
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)}
              placeholder="Όνομα ή ιδιότητα…" />
          </label>
        </div>
        <p className="bio-results" role="status">{members.length} από {teamBiographies.length} βιογραφικά</p>
        <p className="bio-shared-note">
          Στα 8 βιογραφικά που παραδόθηκαν σε μία μορφή, το κείμενο είναι κοινό και στις δύο εκδοχές.
        </p>

        <div className="bio-directory">
          <aside className="bio-index" aria-label="Ευρετήριο βιογραφικών">
            <p className="bio-eyebrow">ΕΥΡΕΤΗΡΙΟ</p>
            <nav aria-label="Μετάβαση σε βιογραφικό">
              {members.map((member) => <a key={member.id} href={`#${member.id}`}>{member.name}</a>)}
            </nav>
          </aside>
          <div className="bio-articles">
            {members.length === 0 && (
              <div className="bio-empty">
                <h2>Δεν βρέθηκαν βιογραφικά.</h2>
                <p>Δοκιμάστε άλλο όνομα ή κατηγορία.</p>
                <button type="button" onClick={() => { setQuery(""); setCategory("all") }}>Εμφάνιση όλης της ομάδας</button>
              </div>
            )}
            {members.map((member) => (
              <article id={member.id} key={member.id} className="bio-article" aria-labelledby={`${member.id}-title`}>
                <header className="bio-article-header">
                  <div className="bio-monogram" aria-hidden="true">
                    {member.name.split(/[\s-]+/).filter(Boolean).map((word) => word[0]).filter((_, i, all) => i === 0 || i === all.length - 1).join("")}
                  </div>
                  <div>
                    <p className="bio-category-label">{categories.find((c) => c.id === member.category)?.label}</p>
                    <h2 id={`${member.id}-title`}>{member.name}</h2>
                    <p className="bio-role">{member.role}</p>
                    {member.roleNeedsConfirmation && <p className="bio-pending">Τίτλος θέσης προς επιβεβαίωση</p>}
                  </div>
                </header>
                <div className="bio-copy">
                  {member.versions[version].map((block, index) => block.type === "paragraph"
                    ? <p key={index}>{block.text}</p>
                    : <ul key={index}>{block.items.map((item) => <li key={item}>{item}</li>)}</ul>)}
                </div>
                <footer className="bio-article-footer">
                  <span>{member.hasTwoVersions ? `${version}η εκδοχή` : "Κοινό κείμενο"}</span>
                  <Link href={`/team/version-${otherVersion}#${member.id}`}>
                    {member.hasTwoVersions ? `Δείτε τη ${otherVersion}η εκδοχή` : "Δείτε στην άλλη σελίδα"}
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </Link>
                </footer>
              </article>
            ))}
          </div>
        </div>
      </Container>
      <div className="bio-bottom-nav">
        <Container className="flex flex-wrap items-center justify-between gap-4">
          <p>Συγκρίνετε τις δύο εκδοχές.</p>
          <Link href={`/team/version-${otherVersion}`}>Μετάβαση στη {otherVersion}η εκδοχή <ArrowUpRight size={18} aria-hidden="true" /></Link>
        </Container>
      </div>
    </div>
  )
}

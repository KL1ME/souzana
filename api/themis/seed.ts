import { home, pages, practiceAreas, site, teamMembers } from "@/lib/content"
import type { KnowledgeDocument } from "./knowledge"

export function websiteKnowledge(): KnowledgeDocument[] {
  const document = (id: string, title: string, content: string, path: string, tags: string[]): KnowledgeDocument => ({
    id: `website:${id}`, title, content, sourceUrl: `${site.url}${path}`, tags,
    approved: true, origin: "website", updatedAt: new Date().toISOString(), expiresAt: null,
  })
  return [
    document("firm", "Η εταιρεία μας", `${site.name}\n${home.intro.paragraphs.join("\n\n")}`, "/#company", ["εταιρεία", "firm", "company", "about"]),
    document("locations", "Καλαμάτα και Αθήνα", `${site.city}\n${pages.team.profile.summary[0]}`, "/team/", ["που", "πόλη", "πόλεις", "έδρα", "γραφεία", "location", "offices", "cities", "based", "Kalamata", "Athens"]),
    document("services", "Τομείς εξειδίκευσης", `${pages.practice.description}\n${practiceAreas.map((area) => area.title).join("\n")}`, "/practice-areas/", ["τομείς", "ειδίκευση", "υπηρεσίες", "υποστήριξη", "services", "practice", "expertise"]),
    ...practiceAreas.map((area) => document(`practice:${area.slug}`, area.title, [...new Set([area.shortDescription, ...area.details, ...area.bullets])].join("\n\n"), `/practice-areas/#${area.slug}`, [area.slug])),
    document("team", "Η ομάδα μας", `${pages.team.profile.title} — ${pages.team.profile.role}\n${pages.team.profile.summary.join("\n")}\n${teamMembers.map((member) => `${member.name} — ${member.title}\n${member.bullets.join("\n")}`).join("\n\n")}`, "/team/", ["ομάδα", "δικηγόροι", "team", "lawyers", "partners"]),
    document("contact", "Στοιχεία επικοινωνίας", [
      `Για επικοινωνία με την ${site.shortName}:`,
      `Τηλέφωνα: ${site.footer.phones.map((phone) => phone.label).join(", ")}.`,
      `Email: ${site.footer.email}.`,
      `Διεύθυνση γραφείου στην Αθήνα: ${site.footer.address.label}.`,
      "Ο ιστότοπος δεν δημοσιεύει ωράριο ή τρόπο κράτησης ραντεβού.",
      "Στη σελίδα της ομάδας υπάρχει το επαγγελματικό προφίλ LinkedIn της Σουζάνας Ι. Κλημεντίδη: " + pages.team.profile.links.map((link) => link.href).join(" "),
    ].join("\n"), "/", ["επικοινωνία", "επικοινωνήσω", "επικοινωνούμε", "τηλέφωνο", "διεύθυνση", "ραντεβού", "contact", "reach", "phone", "telephone", "email", "address", "appointment"]),
  ]
}

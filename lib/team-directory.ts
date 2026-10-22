import { pages, type ContentImage } from "@/lib/content"
import { teamBiographies, type TeamBiography, type BiographyVersion } from "@/lib/team-biographies"

export type DirectoryMember = Omit<TeamBiography, "category"> & {
  category: TeamBiography["category"] | "partners"
  image?: ContentImage
}

const profile = pages.team.profile
const partnerBiography = (profile.biography ?? []).map((text) => ({ type: "paragraph" as const, text }))

export const directoryMembers: DirectoryMember[] = [
  {
    id: "souzana-klimentidi",
    name: profile.title,
    role: profile.role,
    category: "partners",
    image: profile.image,
    roleNeedsConfirmation: false,
    hasTwoVersions: false,
    source: "Existing firm profile",
    versions: { "1": partnerBiography, "2": partnerBiography },
  },
  ...teamBiographies,
]

export const directoryCategories = [
  { id: "all", label: "Όλη η ομάδα" },
  { id: "partners", label: "Διαχείριση" },
  { id: "lawyers", label: "Δικηγόροι" },
  { id: "trainees", label: "Ασκούμενοι" },
  { id: "administration", label: "Διοικητική υποστήριξη" },
] as const

export function directoryPath(version?: BiographyVersion) {
  return version ? `/team/version-${version}` : "/team"
}

export function memberPath(id: string, version?: BiographyVersion) {
  return `${directoryPath(version)}/${id}`
}

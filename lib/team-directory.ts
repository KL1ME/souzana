import { pages, type ContentImage } from "@/lib/content"
import { teamBiographies, type TeamBiography, type BiographyVersion } from "@/lib/team-biographies"

export type DirectoryMember = Omit<TeamBiography, "category"> & {
  category: TeamBiography["category"] | null
  image?: ContentImage
}

const profile = pages.team.profile

export const directoryMembers: DirectoryMember[] = [
  {
    id: "souzana-klimentidi",
    name: profile.title,
    role: "",
    category: null,
    image: profile.image,
    roleNeedsConfirmation: false,
    hasTwoVersions: false,
    source: "Supplied name and photograph only; biography not provided",
    versions: { "1": [], "2": [] },
  },
  ...teamBiographies,
]

export const directoryCategories = [
  { id: "all", label: "Όλη η ομάδα" },
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

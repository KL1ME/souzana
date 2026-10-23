import source from "./team-biographies.json"

export type BiographyVersion = "1" | "2"
export type BiographyCategory = "lawyers" | "trainees" | "administration"
export type BiographyBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }

export type TeamBiography = {
  id: string
  name: string
  role: string
  roleNeedsConfirmation: boolean
  category: BiographyCategory
  hasTwoVersions: boolean
  source: string
  versions: Record<BiographyVersion, BiographyBlock[]>
}

// Greek biographies sourced from the supplied DOCX files.
// Requested editorial variants reformat the same supplied facts.
// Every biography now has a distinct second version with lists.
export const teamBiographies = source as TeamBiography[]

export function biographyInitials(name: string) {
  const words = name.split(/[\s–-]+/).filter(Boolean)
  return [words[0]?.[0], words.length > 1 ? words.at(-1)?.[0] : ""].join("")
}

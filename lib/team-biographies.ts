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

// Greek text and paragraph/list structure transcribed from the 21 supplied DOCX files.
// Single-version biographies intentionally use the same blocks in both previews.
export const teamBiographies = source as TeamBiography[]

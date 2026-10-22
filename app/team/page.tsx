import BiographyPreview from "@/components/team/BiographyPreview"
import { pages } from "@/lib/content"
import { createPageMetadata } from "@/lib/metadata"

export const metadata = createPageMetadata(pages.team.title, pages.team.description, "/team")

export default function TeamPage() {
  return <BiographyPreview preview={false} />
}

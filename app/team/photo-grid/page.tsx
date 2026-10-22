import TeamPhotoGrid from "@/components/team/TeamPhotoGrid"
import { createPageMetadata } from "@/lib/metadata"

export const metadata = {
  ...createPageMetadata("Η ομάδα μας · Φωτογραφίες", "Παρουσίαση της ομάδας σε πλέγμα φωτογραφιών.", "/team/photo-grid"),
  robots: { index: false, follow: true },
}

export default function TeamPhotoGridPage() {
  return <TeamPhotoGrid />
}

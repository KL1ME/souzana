import BiographyPreview from "@/components/team/BiographyPreview"
import { createPageMetadata } from "@/lib/metadata"

export const metadata = {
  ...createPageMetadata("Βιογραφικά · 1η εκδοχή", "Αφηγηματική παρουσίαση των 21 βιογραφικών της ομάδας.", "/team/version-1"),
  robots: { index: false, follow: true },
}

export default function TeamVersionOne() {
  return <BiographyPreview version="1" />
}

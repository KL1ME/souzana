import BiographyPreview from "@/components/team/BiographyPreview"
import { createPageMetadata } from "@/lib/metadata"

export const metadata = {
  ...createPageMetadata("Βιογραφικά · 2η εκδοχή", "Παρουσίαση των 21 βιογραφικών της ομάδας με λίστες αντικειμένων δραστηριότητας.", "/team/version-2"),
  robots: { index: false, follow: true },
}

export default function TeamVersionTwo() {
  return <BiographyPreview version="2" />
}

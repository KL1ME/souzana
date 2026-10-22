import BiographyPreview from "@/components/team/BiographyPreview"
import { createPageMetadata } from "@/lib/metadata"

export const metadata = {
  ...createPageMetadata("Βιογραφικά · 1η εκδοχή", "Γνωρίστε την ομάδα μας και διαβάστε τα βιογραφικά σε αφηγηματική μορφή.", "/team/version-1"),
  robots: { index: false, follow: true },
}

export default function TeamVersionOne() {
  return <BiographyPreview version="1" />
}

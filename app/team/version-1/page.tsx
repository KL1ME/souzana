import TeamPhotoGrid from "@/components/team/TeamPhotoGrid"
import { createPageMetadata } from "@/lib/metadata"

export const metadata = {
  ...createPageMetadata("Βιογραφικά · 1η εκδοχή", "Γνωρίστε την ομάδα μας και διαβάστε τα βιογραφικά σε αφηγηματική μορφή.", "/team/version-1"),
  robots: { index: false, follow: true },
}

export default function TeamVersionOne() {
  return <TeamPhotoGrid version="1" />
}

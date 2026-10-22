import TeamPhotoGrid from "@/components/team/TeamPhotoGrid"
import { createPageMetadata } from "@/lib/metadata"

export const metadata = {
  ...createPageMetadata("Βιογραφικά · 2η εκδοχή", "Γνωρίστε την ομάδα μας και διαβάστε τα βιογραφικά με λίστες αντικειμένων δραστηριότητας.", "/team/version-2"),
  robots: { index: false, follow: true },
}

export default function TeamVersionTwo() {
  return <TeamPhotoGrid version="2" />
}

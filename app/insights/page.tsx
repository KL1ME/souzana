import MediaPage, { metadata } from "@/app/media/page"
import LegacyInsightsRedirect from "@/components/publications/LegacyInsightsRedirect"

export { metadata }

export default function InsightsPage() {
  return (
    <>
      <LegacyInsightsRedirect />
      <MediaPage />
    </>
  )
}

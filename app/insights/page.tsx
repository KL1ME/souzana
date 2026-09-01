import Container from "@/components/layout/Container"
import SectionHeader from "@/components/layout/SectionHeader"
import InsightsList from "@/components/insights/InsightsList"
import { pages } from "@/lib/content"
import { createPageMetadata } from "@/lib/metadata"

export const metadata = createPageMetadata(
  pages.insights.title,
  pages.insights.description,
  "/insights"
)

export default function InsightsPage() {
  return (
    <div className="pb-16 sm:pb-24">
      <section className="border-b border-border/60 bg-muted py-14 sm:py-20 lg:py-24">
        <Container>
          <SectionHeader
            eyebrow={pages.insights.eyebrow}
            title={pages.insights.title}
            description={pages.insights.description}
            headingLevel="h1"
          />
        </Container>
      </section>
      <section className="py-16 sm:py-24">
        <Container>
          <InsightsList />
        </Container>
      </section>
    </div>
  )
}

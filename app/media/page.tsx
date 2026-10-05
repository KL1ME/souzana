import Container from "@/components/layout/Container"
import SectionHeader from "@/components/layout/SectionHeader"
import PublicationsList from "@/components/publications/PublicationsList"
import { pages } from "@/lib/content"
import { publications, publicationFilters } from "@/lib/publications"
import { createPageMetadata } from "@/lib/metadata"

export const metadata = createPageMetadata(
  pages.media.title,
  pages.media.description,
  "/media"
)

export default function MediaPage() {
  return (
    <div className="pb-16 sm:pb-24">
      <section className="border-b border-border/60 bg-muted py-14 sm:py-20 lg:py-24">
        <Container>
          <SectionHeader
            eyebrow={pages.media.eyebrow}
            title={pages.media.title}
            description={pages.media.description}
            headingLevel="h1"
          />
        </Container>
      </section>
      <section className="py-10 sm:py-14">
        <Container className="space-y-12">
          <PublicationsList publications={publications} filters={publicationFilters} />
          <p className="text-xs text-muted-foreground">{pages.media.note}</p>
        </Container>
      </section>
    </div>
  )
}

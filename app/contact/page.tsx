import Image from "next/image"
import Container from "@/components/layout/Container"
import SectionHeader from "@/components/layout/SectionHeader"
import ContactForm from "@/components/forms/ContactForm"
import { pages, site } from "@/lib/content"
import { createPageMetadata } from "@/lib/metadata"

export const metadata = createPageMetadata(
  pages.contact.title,
  pages.contact.description,
  "/contact"
)

export default function ContactPage() {
  return (
    <div className="pb-16 sm:pb-24">
      <section className="border-b border-border/60 bg-muted py-14 sm:py-20 lg:py-24">
        <Container>
          <SectionHeader
            eyebrow={pages.contact.eyebrow}
            title={pages.contact.title}
            description={pages.contact.description}
            headingLevel="h1"
          />
        </Container>
      </section>
      <section className="py-16 sm:py-24">
        <Container className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-border/60 bg-card p-5 sm:p-8 md:p-10">
            <ContactForm />
          </div>
          <div className="space-y-8">
            <div className="relative aspect-[3/2] overflow-hidden rounded-3xl border border-border/60">
              <Image
                src={pages.contact.officeImage.src}
                alt={pages.contact.officeImage.alt}
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 35vw, 90vw"
              />
            </div>
            <div className="rounded-3xl border border-border/60 bg-card p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Γραφεία
              </p>
              <h3 className="mt-3 text-2xl font-semibold font-serif">
                {site.city}
              </h3>
              <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                {site.contact.offices.map((office) => (
                  <div key={office.label} className="border-l border-accent/50 pl-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                      {office.label}
                    </p>
                    <p className="mt-1 text-muted-foreground">{office.address}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-col items-start gap-2 text-sm text-muted-foreground">
                <p>{site.contact.hours}</p>
                {site.contact.phone ? (
                  <a
                    href={`tel:${site.contact.phone.replace(/\s/g, "")}`}
                    className="inline-flex transition-colors hover:text-foreground"
                  >
                    {site.contact.phone}
                  </a>
                ) : null}
                <a
                  href={`mailto:${site.contact.email}`}
                  className="inline-flex break-all transition-colors hover:text-foreground sm:break-normal"
                >
                  {site.contact.email}
                </a>
              </div>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              {site.legal.footer.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>
        </Container>
      </section>
    </div>
  )
}

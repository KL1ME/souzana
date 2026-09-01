import Link from "next/link"
import Container from "@/components/layout/Container"
import { site } from "@/lib/content"

export default function Footer() {
  return (
    <footer className="border-t border-accent/30 bg-background">
      <Container className="grid gap-10 py-12 sm:py-16 md:grid-cols-[1.1fr_1fr_1fr]">
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="flex flex-col font-serif text-xl leading-tight tracking-[0.02em] sm:text-2xl">
              <span>{site.wordmark.primary}</span>
              <span>{site.wordmark.secondary}</span>
            </p>
            <p className="text-[0.58rem] uppercase tracking-[0.25em] text-muted-foreground">
              {site.wordmark.subtitle}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">{site.seo.description}</p>
        </div>
        <div className="flex flex-col items-start gap-3 text-sm">
          <p className="font-semibold text-foreground">Επικοινωνία</p>
          <div className="space-y-3">
            {site.contact.offices.map((office) => (
              <div key={office.label}>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                  {office.label}
                </p>
                <p className="mt-1 text-muted-foreground">{office.address}</p>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground">{site.contact.hours}</p>
          {site.contact.phone ? (
            <a
              href={`tel:${site.contact.phone.replace(/\s/g, "")}`}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {site.contact.phone}
            </a>
          ) : null}
          <a
            href={`mailto:${site.contact.email}`}
            className="break-all text-muted-foreground transition-colors hover:text-foreground sm:break-normal"
          >
            {site.contact.email}
          </a>
        </div>
        <div className="space-y-3 text-sm">
          <p className="font-semibold text-foreground">Σύνδεσμοι</p>
          <div className="flex flex-col gap-2 text-muted-foreground">
            {site.nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
            <Link href="/privacy" className="transition-colors hover:text-foreground">
              Πολιτική Απορρήτου
            </Link>
          </div>
          <div className="mt-6 space-y-2 text-xs text-muted-foreground">
            {site.legal.footer.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
      </Container>
      <Container className="border-t border-border/60 py-6 text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} {site.name}. Με επιφύλαξη παντός δικαιώματος.</p>
      </Container>
    </footer>
  )
}

import Link from "next/link"
import Container from "@/components/layout/Container"
import { site } from "@/lib/content"

export default function Footer() {
  return (
    <footer className="border-t border-accent/30 bg-background">
      <Container className="grid gap-10 py-12 sm:py-16 md:grid-cols-[1.6fr_1fr] md:gap-16">
        <div className="space-y-6">
          <div className="space-y-4">
            <p className="font-serif text-xl font-semibold leading-tight tracking-[0.025em] sm:text-2xl">
              {site.footer.name}
            </p>
            <p className="text-sm font-semibold leading-relaxed text-foreground">
              {site.footer.firmName}
              <br />
              {site.footer.firmType}
            </p>
          </div>
          <address className="space-y-2 text-sm not-italic leading-relaxed text-muted-foreground">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {site.footer.phones.map((phone, index) => (
                <span key={phone.href} className="inline-flex items-center gap-2">
                  {index > 0 && <span aria-hidden="true">|</span>}
                  <a href={phone.href} className="whitespace-nowrap transition-colors hover:text-foreground">
                    {phone.label}
                  </a>
                </span>
              ))}
            </div>
            <p>
              <a href={site.footer.address.href} className="underline decoration-accent/50 underline-offset-4 transition-colors hover:text-foreground">
                {site.footer.address.label}
              </a>
            </p>
            <p>
              <a href={`mailto:${site.footer.email}`} className="underline decoration-accent/50 underline-offset-4 transition-colors hover:text-foreground">
                {site.footer.email}
              </a>
            </p>
          </address>
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

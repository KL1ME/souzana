import Image from "next/image"
import Link from "next/link"
import Container from "@/components/layout/Container"
import SectionHeader from "@/components/layout/SectionHeader"
import { Card } from "@/components/ui/card"
import { Award, ExternalLink } from "lucide-react"
import { pages, teamMembers } from "@/lib/content"
import { createPageMetadata } from "@/lib/metadata"

export const metadata = createPageMetadata(
  pages.team.title,
  pages.team.description,
  "/team"
)

export default function TeamPage() {
  const members = teamMembers
  const profile = pages.team.profile

  return (
    <div className="pb-16 sm:pb-24">
      <section className="border-b border-border/60 bg-muted py-14 sm:py-20 lg:py-24">
        <Container>
          <SectionHeader
            eyebrow={pages.team.eyebrow}
            title={pages.team.title}
            description={pages.team.description}
            headingLevel="h1"
          />
        </Container>
      </section>
      <section className="py-16 sm:py-24">
        <Container className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-6">
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-border/60">
              <Image
                src={profile.image.src}
                alt={profile.image.alt}
                fill
                loading="eager"
                className="object-cover object-[50%_30%]"
                sizes="(min-width: 1024px) 40vw, 90vw"
              />
            </div>
            {profile.awards?.map((award) => (
              <Card key={award.href} className="gap-4 border-accent/40 bg-[#faf7ef]">
                <div className="flex items-center gap-3 text-accent">
                  <Award className="size-6" aria-hidden="true" />
                  <p className="text-xs font-semibold uppercase tracking-[0.2em]">
                    Διάκριση {award.year}
                  </p>
                </div>
                <h2 className="font-serif text-2xl font-semibold">{award.title}</h2>
                <p className="text-sm text-muted-foreground">{award.category}</p>
                <Link
                  href={award.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold underline decoration-accent/60 underline-offset-4"
                >
                  Η διάκριση στον επίσημο διοργανωτή
                  <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
                </Link>
              </Card>
            ))}
          </div>
          <div className="space-y-6">
            <Card className="gap-4">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {profile.eyebrow}
                </p>
                <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl font-serif">
                  {profile.title}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span>{profile.role}</span>
                  {profile.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-foreground underline decoration-accent/60 underline-offset-4 transition-colors hover:decoration-accent"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {profile.summary.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-1 size-1.5 rounded-full bg-accent" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                {profile.biography?.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-relaxed text-muted-foreground">
                    {paragraph}
                  </p>
                ))}
              </div>
            </Card>
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="h-full">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Εμπειρία
                </p>
                <div className="mt-4 space-y-4 text-sm text-muted-foreground">
                  {profile.experience.map((item) => (
                    <div key={item.title}>
                      <p className="font-semibold text-foreground">{item.title}</p>
                      {item.period ? (
                        <p className="text-xs text-muted-foreground">{item.period}</p>
                      ) : null}
                      <ul className="mt-2 space-y-1">
                        {item.details.map((detail) => (
                          <li key={detail}>{detail}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="h-full">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Εκπαίδευση
                </p>
                <div className="mt-4 space-y-4 text-sm text-muted-foreground">
                  {profile.education.map((item) => (
                    <div key={item.title}>
                      <p className="font-semibold text-foreground">{item.title}</p>
                      {item.period ? (
                        <p className="text-xs text-muted-foreground">{item.period}</p>
                      ) : null}
                      <ul className="mt-2 space-y-1">
                        {item.details.map((detail) => (
                          <li key={detail}>{detail}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="h-full">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Γλώσσες & Εξειδίκευση
                </p>
                <div className="mt-4 space-y-5 text-sm text-muted-foreground">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Γλώσσες
                    </p>
                    <ul className="mt-2 space-y-2">
                      {profile.languages.map((language) => (
                        <li key={language}>{language}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Εξειδίκευση
                    </p>
                    <ul className="mt-2 space-y-2">
                      {profile.skills.map((skill) => (
                        <li key={skill}>{skill}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </Container>
      </section>
      <section className="border-t border-border/60 py-16 sm:py-24">
        <Container className="space-y-10">
          <SectionHeader
            eyebrow="Δίκτυο συνεργατών"
            title="Εξειδικευμένοι συνεργάτες ανά αντικείμενο"
            description="Συντονισμένη υποστήριξη για ειδικά ζητήματα, χωρίς υπερβολές."
          />
          <div className="grid gap-6 md:grid-cols-2">
            {members.map((member) => (
              <Card key={member.name} className="gap-6">
                {member.image ? (
                  <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-border/50">
                    <Image
                      src={member.image.src}
                      alt={member.image.alt}
                      fill
                      className="object-cover"
                      sizes="(min-width: 1024px) 40vw, 90vw"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[4/5] items-center justify-center rounded-2xl border border-border/50 bg-muted">
                    <span className="font-serif text-3xl tracking-[0.2em] text-foreground">
                      {member.initials}
                    </span>
                  </div>
                )}
                <div className="space-y-3">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">
                      {member.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">{member.title}</p>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {member.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2">
                        <span className="mt-1 size-1.5 rounded-full bg-accent" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            ))}
          </div>
        </Container>
      </section>
    </div>
  )
}

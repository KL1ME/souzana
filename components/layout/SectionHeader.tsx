import { cn } from "@/lib/utils"

type SectionHeaderProps = {
  eyebrow?: string
  title: string
  description?: string
  align?: "left" | "center"
  headingLevel?: "h1" | "h2"
}

export default function SectionHeader({
  eyebrow,
  title,
  description,
  align = "left",
  headingLevel = "h2",
}: SectionHeaderProps) {
  const Heading = headingLevel

  return (
    <div
      className={cn(
        "space-y-3",
        align === "center" && "mx-auto max-w-2xl text-center"
      )}
    >
      {eyebrow ? (
        <div className="space-y-3">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
            {eyebrow}
          </p>
          <div className="hairline-gold w-24" />
        </div>
      ) : null}
      <Heading className="font-serif text-[2rem] font-semibold leading-[1.08] tracking-[0.01em] text-foreground sm:text-4xl">
        {title}
      </Heading>
      {description ? (
        <p
          className={cn(
            "text-base text-muted-foreground leading-relaxed",
            align === "center" ? "mx-auto max-w-xl" : "max-w-2xl"
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  )
}

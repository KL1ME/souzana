"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, ExternalLink, FileText } from "lucide-react"
import { Card } from "@/components/ui/card"
import type { Publication, PublicationFilter } from "@/lib/publications"
import { cn } from "@/lib/utils"

type Filter = { id: PublicationFilter; label: string }

export default function PublicationsList({
  publications,
  filters,
}: {
  publications: Publication[]
  filters: readonly Filter[]
}) {
  const [activeFilter, setActiveFilter] = useState<PublicationFilter>("all")
  const visible = activeFilter === "all"
    ? publications
    : publications.filter((item) => item.category === activeFilter)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3" role="group" aria-label="Φίλτρα δημοσιεύσεων">
        {filters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            aria-pressed={activeFilter === filter.id}
            aria-controls="publications-results"
            onClick={() => setActiveFilter(filter.id)}
            className={cn(
              "min-h-11 rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              activeFilter === filter.id
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background text-foreground/80 hover:border-accent hover:text-foreground"
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground" role="status" aria-live="polite" aria-atomic="true">
        {activeFilter === "all" ? "Όλες οι δημοσιεύσεις" : filters.find((filter) => filter.id === activeFilter)?.label}
        {" · "}{visible.length}
      </p>
      <div id="publications-results" className="grid gap-6 md:grid-cols-2">
        {visible.map((item) => {
          const isArticle = item.destination === "article"
          const isPdf = item.destination === "pdf"
          const isVideo = item.category === "videos"
          const linkClass = "underline decoration-transparent underline-offset-4 transition-colors hover:decoration-accent focus-visible:decoration-accent"
          const actionClass = "mt-auto inline-flex items-center gap-2 pt-4 text-sm font-semibold text-foreground underline decoration-accent/60 underline-offset-4 transition-colors hover:decoration-accent"

          return (
            <Card key={item.id} className="gap-0 overflow-hidden p-0 sm:p-0">
              {item.image ? (
                <div className={cn(
                  "relative overflow-hidden border-b border-border/60 bg-muted",
                  isVideo ? "aspect-video" : item.image.fit === "contain" ? "h-80" : "aspect-[16/10]"
                )}>
                  <Image
                    src={item.image.src}
                    alt={item.image.alt}
                    fill
                    className={item.image.fit === "contain" ? (isVideo ? "object-contain" : "object-contain p-3") : "object-cover object-[50%_30%]"}
                    style={item.image.position ? { objectPosition: item.image.position } : undefined}
                    sizes="(min-width: 1200px) 560px, (min-width: 768px) 45vw, 90vw"
                  />
                </div>
              ) : null}
              <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-muted-foreground">
                  <span>{item.outlet}</span>
                  {item.dateLabel ? <span>{item.dateLabel}</span> : null}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="font-semibold text-accent">{item.format}</span>
                  <span>{isArticle ? "Πλήρες κείμενο στο site" : isPdf ? "Αρχείο PDF" : "Στην αρχική πηγή"}</span>
                </div>
                <h2 className="font-serif text-lg font-semibold text-foreground">
                  {isArticle ? (
                    <Link href={item.href} className={linkClass}>{item.title}</Link>
                  ) : (
                    <a href={item.href} target="_blank" rel="noreferrer" className={linkClass}>{item.title}</a>
                  )}
                </h2>
                <p className="text-sm text-muted-foreground">{item.description}</p>
                {isArticle ? (
                  <Link href={item.href} className={actionClass}>
                    {item.linkLabel}<ArrowRight className="size-4 shrink-0" aria-hidden="true" />
                  </Link>
                ) : (
                  <a href={item.href} target="_blank" rel="noreferrer" className={actionClass}>
                    {item.linkLabel}
                    {isPdf ? <FileText className="size-4 shrink-0" aria-hidden="true" /> : <ExternalLink className="size-4 shrink-0" aria-hidden="true" />}
                  </a>
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

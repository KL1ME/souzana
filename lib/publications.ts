import { media, posts, site } from "@/lib/content"
import type { ContentImage, MediaItem } from "@/lib/content"
import { formatDate } from "@/lib/format"

export const publicationFilters = [
  { id: "all", label: "Όλα" },
  { id: "articles", label: "Άρθρα" },
  { id: "interviews", label: "Συνεντεύξεις" },
  { id: "videos", label: "Βίντεο & Podcasts" },
  { id: "conferences", label: "Συνέδρια" },
] as const

export type PublicationFilter = typeof publicationFilters[number]["id"]

export type Publication = {
  id: string
  title: string
  href: string
  category: Exclude<PublicationFilter, "all">
  format: string
  outlet: string
  dateLabel?: string
  description: string
  image?: ContentImage
  destination: "article" | "pdf" | "source"
  linkLabel: string
}

const mediaCategories: Record<MediaItem["format"], Publication["category"]> = {
  Άρθρο: "articles",
  Ρεπορτάζ: "articles",
  Συνέντευξη: "interviews",
  Βίντεο: "videos",
  Ηχητικό: "videos",
  Συνέδριο: "conferences",
  Ομιλία: "conferences",
  Διάκριση: "conferences",
}

export const publications: Publication[] = [
  ...posts.map((post): Publication => ({
    id: post.slug,
    title: post.title,
    href: `/insights/${post.slug}`,
    category: "articles",
    format: post.category,
    outlet: post.author ?? site.shortName,
    dateLabel: post.dateLabel ?? formatDate(post.date),
    description: post.excerpt,
    image: post.image,
    destination: "article",
    linkLabel: "Διαβάστε το άρθρο",
  })),
  ...media.sections.flatMap((section) => section.items.map((item): Publication => ({
    id: item.href,
    title: item.title,
    href: item.href,
    category: mediaCategories[item.format],
    format: item.format,
    outlet: item.outlet,
    dateLabel: item.dateLabel ?? (item.date ? formatDate(item.date) : undefined),
    description: item.description,
    image: item.image,
    destination: item.href.endsWith(".pdf") ? "pdf" : "source",
    linkLabel: item.linkLabel ?? "Δείτε τη δημοσίευση",
  }))),
]

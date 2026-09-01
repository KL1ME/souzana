import type { Metadata } from "next"
import { site } from "@/lib/content"

const socialImage = {
  url: `${site.url}/og.png`,
  width: 1200,
  height: 630,
  alt: `${site.shortName} — Δικηγορική Εταιρεία`,
}

export function createPageMetadata(
  title: string,
  description: string,
  pathname: string
): Metadata {
  const normalizedPath = pathname === "/" ? "/" : `/${pathname.replace(/^\/+|\/+$/g, "")}/`
  const url = `${site.url}${normalizedPath}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: site.shortName,
      locale: "el_GR",
      type: "website",
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage.url],
    },
  }
}

// Convert this site's sources to Next.js routes so navigation keeps the root chat mounted.
export function internalThemisSourceHref(sourceUrl: string, websiteUrl: string): string | null {
  try {
    const source = new URL(sourceUrl)
    const website = new URL(websiteUrl)
    const basePath = website.pathname.replace(/\/+$/u, "")
    if (!["https:", "http:"].includes(source.protocol) || source.username || source.password ||
      source.origin !== website.origin || (source.pathname !== basePath && !source.pathname.startsWith(`${basePath}/`))) return null
    return `${source.pathname.slice(basePath.length) || "/"}${source.search}${source.hash}`
  } catch { return null }
}

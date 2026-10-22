import type { MetadataRoute } from "next"
import { site } from "@/lib/content"
import { posts } from "@/lib/content"
import { directoryMembers, memberPath } from "@/lib/team-directory"

export const dynamic = "force-static"

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "/",
    "/practice-areas",
    "/team",
    "/media",
  ]
  const postRoutes = posts.map((post) => `/insights/${post.slug}`)

  const memberRoutes = directoryMembers.map((member) => memberPath(member.id))

  return [...routes, ...postRoutes, ...memberRoutes].map((route) => ({
    url: `${site.url}${route}`,
    lastModified: new Date(),
  }))
}

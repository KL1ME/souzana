import Image from "next/image"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { posts } from "@/lib/content"
import { formatDate } from "@/lib/format"

export default function InsightsList() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {posts.map((post, index) => (
        <Card key={post.slug} className="gap-4">
          <div className="relative aspect-[16/9] overflow-hidden rounded-xl border border-border/60">
            <Image
              src={post.image.src}
              alt={post.image.alt}
              fill
              loading={index === 0 ? "eager" : "lazy"}
              className="object-cover"
              sizes="(min-width: 1024px) 30vw, 90vw"
            />
          </div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {formatDate(post.date)}
          </div>
          <div className="space-y-3">
            <h2 className="font-serif text-lg font-semibold tracking-tight text-foreground">
              {post.title}
            </h2>
            <p className="text-sm text-muted-foreground">{post.excerpt}</p>
          </div>
          <Link
            href={`/insights/${post.slug}`}
            className="text-sm font-semibold text-foreground underline decoration-accent/60 underline-offset-4 transition-colors hover:decoration-accent"
          >
            Διαβάστε
          </Link>
        </Card>
      ))}
    </div>
  )
}

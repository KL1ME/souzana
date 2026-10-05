import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import Container from "@/components/layout/Container"
import { Card } from "@/components/ui/card"
import Prose from "@/components/typography/Prose"
import { pages, posts, site } from "@/lib/content"
import { estimateReadingTime, formatDate, slugify } from "@/lib/format"
import { ArrowLeft, ExternalLink } from "lucide-react"

const buildToc = (content: typeof posts[number]["content"]) =>
  content
    .filter((block) => block.type === "heading")
    .map((block) => ({
      text: block.text,
      id: slugify(block.text),
      level: block.level,
    }))

export const dynamicParams = false

export async function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = posts.find((item) => item.slug === slug)
  if (!post) {
    return { title: "Insight" }
  }
  const imagePath = post.image.src.replace(/^\/souzana/, "")
  const imageUrl = `${site.url}${imagePath}`

  return {
    title: post.title,
    description: post.excerpt,
    alternates: {
      canonical: `${site.url}/insights/${post.slug}/`,
    },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      url: `${site.url}/insights/${post.slug}/`,
      publishedTime: post.dateLabel ? undefined : post.date,
      modifiedTime: post.dateLabel ? post.date : undefined,
      authors: post.author ? [post.author] : undefined,
      images: [{ url: imageUrl, alt: post.image.alt }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [imageUrl],
    },
  }
}

export default async function InsightDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = posts.find((item) => item.slug === slug)
  if (!post) {
    notFound()
  }

  const toc = buildToc(post.content)
  const related = posts.filter((item) => item.slug !== post.slug).slice(0, 2)

  return (
    <div className="pb-16 sm:pb-24">
      <section className="border-b border-border/60 bg-muted py-14 sm:py-20 lg:py-24">
        <Container>
          <div className="space-y-6">
            <Link
              href="/media"
              className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Όλα τα άρθρα & μέσα
            </Link>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              {pages.insights.eyebrow}
            </p>
            <h1 className="font-serif text-[2rem] font-semibold leading-[1.08] tracking-tight text-foreground sm:text-4xl">
              {post.title}
            </h1>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span>{post.dateLabel ?? formatDate(post.date)}</span>
              <span>{estimateReadingTime(post.content)}</span>
              {post.author ? <span>{post.author}</span> : null}
            </div>
            <p className="text-base text-muted-foreground max-w-2xl">
              {post.excerpt}
            </p>
            <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl border border-border/60 sm:rounded-3xl">
              <Image
                src={post.image.src}
                alt={post.image.alt}
                fill
                loading="eager"
                className="object-cover"
                style={post.image.position ? { objectPosition: post.image.position } : undefined}
                sizes="(min-width: 1024px) 70vw, 100vw"
              />
            </div>
          </div>
        </Container>
      </section>
      <section className="py-16 sm:py-24">
        <Container className="grid gap-12 lg:grid-cols-[1fr_280px]">
          <article>
            <Prose>
              {post.content.map((block, index) => {
                if (block.type === "heading") {
                  const Heading = block.level === 2 ? "h2" : "h3"
                  return (
                    <Heading key={block.text + index} id={slugify(block.text)}>
                      {block.text}
                    </Heading>
                  )
                }
                if (block.type === "paragraph") {
                  return <p key={block.text + index}>{block.text}</p>
                }
                if (block.type === "list") {
                  return (
                    <ul key={block.items.join("-") + index}>
                      {block.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )
                }
                return null
              })}
            </Prose>
            {post.sources?.length ? (
              <section className="mt-12 space-y-4 border-t border-border/60 pt-8" aria-labelledby="article-sources">
                <h2 id="article-sources" className="font-serif text-2xl font-semibold">
                  Πηγές και αναφορές
                </h2>
                <ul className="space-y-3 text-sm">
                  {post.sources.map((source) => (
                    <li key={source.href}>
                      <a
                        href={source.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-start gap-2 underline decoration-accent/60 underline-offset-4"
                      >
                        {source.label}
                        <ExternalLink className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {post.sourceNote ? (
              <p className="mt-8 text-sm leading-relaxed text-muted-foreground">{post.sourceNote}</p>
            ) : null}
            <p className="mt-10 text-sm text-muted-foreground">
              {pages.insights.note}
            </p>
          </article>
          <aside className="space-y-6">
            <Card className="gap-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Περιεχόμενα
              </div>
              <div className="space-y-2 text-sm">
                {toc.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className={`block text-muted-foreground transition-colors hover:text-foreground ${
                      item.level === 3 ? "pl-3" : ""
                    }`}
                  >
                    {item.text}
                  </a>
                ))}
              </div>
            </Card>
            <Card className="gap-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {pages.insights.relatedLabel}
              </div>
              <div className="space-y-3 text-sm">
                {related.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/insights/${item.slug}`}
                    className="block text-foreground/80 underline decoration-accent/50 underline-offset-4 transition-colors hover:text-foreground"
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            </Card>
          </aside>
        </Container>
      </section>
    </div>
  )
}

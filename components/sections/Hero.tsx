import Link from "next/link"
import Image from "next/image"
import { ArrowDown } from "lucide-react"
import { assetPath } from "@/lib/asset"
import { site } from "@/lib/content"

export default function Hero() {
  return (
    <section id="home-visual" className="hero-graphic" aria-labelledby="home-title">
      <h1 id="home-title" className="sr-only">
        {site.shortName} — Δικηγορική Εταιρεία
      </h1>
      <Image
        src={assetPath("/images/home-architecture.webp")}
        alt=""
        fill
        priority
        sizes="100vw"
        className="hero-image"
      />
      <div className="hero-shade" aria-hidden="true" />
      <Link
        href="/#company"
        className="hero-scroll"
        aria-label="Γνωρίστε την εταιρεία μας"
      >
        <ArrowDown className="size-6" strokeWidth={1.25} aria-hidden="true" />
      </Link>
    </section>
  )
}

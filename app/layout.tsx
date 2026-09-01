import type { Metadata } from "next"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { site } from "@/lib/content"
import "./globals.css"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "greek"],
})

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.seo.title,
    template: `%s | ${site.shortName}`,
  },
  description: site.seo.description,
  alternates: {
    canonical: `${site.url}/`,
  },
  openGraph: {
    title: site.seo.title,
    description: site.seo.description,
    url: site.url,
    siteName: site.shortName,
    locale: "el_GR",
    type: "website",
    images: [
      {
        url: `${site.url}/og.png`,
        width: 1200,
        height: 630,
        alt: `${site.shortName} — Δικηγορική Εταιρεία`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: site.seo.title,
    description: site.seo.description,
    images: [`${site.url}/og.png`],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const legalServiceSchema = {
    "@context": "https://schema.org",
    "@type": "LegalService",
    name: site.name,
    url: site.url,
    areaServed: ["Καλαμάτα, Ελλάδα", "Αθήνα, Ελλάδα"],
    address: site.contact.offices.map((office) => ({
      "@type": "PostalAddress",
      streetAddress: office.streetAddress,
      addressLocality: office.city,
      addressCountry: "GR",
    })),
    ...(site.contact.phone ? { telephone: site.contact.phone } : {}),
    email: site.contact.email,
  }

  return (
    <html lang="el" className="scroll-smooth" data-scroll-behavior="smooth">
      <body
        className={`${inter.variable} ${cormorant.variable} bg-background text-foreground font-sans antialiased`}
      >
        <a href="#main-content" className="skip-link">
          Μετάβαση στο περιεχόμενο
        </a>
        <Header />
        <main id="main-content" className="min-h-screen">
          {children}
        </main>
        <Footer />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(legalServiceSchema),
          }}
        />
      </body>
    </html>
  )
}

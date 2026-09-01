"use client"

import Link from "next/link"
import { useState } from "react"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import { site } from "@/lib/content"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

export default function Header() {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/"
    }
    return pathname?.startsWith(href)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-accent/30 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-20 w-full max-w-[1200px] items-center justify-between px-5 sm:h-24 sm:px-6">
        <Link
          href="/"
          className="flex min-w-0 max-w-[260px] flex-col gap-1 leading-none sm:max-w-none"
          aria-label={site.name}
        >
          <span className="whitespace-nowrap font-serif text-[1.02rem] font-semibold tracking-[0.035em] text-foreground sm:text-[1.2rem] lg:text-[1.3rem]">
            {site.wordmark.primary}
          </span>
          <span className="whitespace-nowrap text-[0.48rem] font-medium uppercase tracking-[0.18em] text-muted-foreground sm:text-[0.56rem] sm:tracking-[0.24em]">
            {site.wordmark.secondary} <span aria-hidden="true">•</span>{" "}
            {site.wordmark.subtitle}
          </span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm md:flex" aria-label="Κύρια πλοήγηση">
          {site.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative text-muted-foreground transition-colors after:absolute after:-bottom-2 after:left-0 after:h-px after:w-0 after:bg-accent/70 after:transition-all hover:text-foreground hover:after:w-full",
                isActive(item.href) &&
                  "text-foreground after:w-full after:bg-accent"
              )}
              aria-current={isActive(item.href) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
          <Button asChild variant="outline" className="ml-2 h-9">
            <Link href="/contact">Κλείστε συνάντηση</Link>
          </Button>
        </nav>
        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-11 md:hidden"
              aria-label={isMenuOpen ? "Κλείσιμο μενού" : "Άνοιγμα μενού"}
            >
              <Menu className="size-6" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-[88vw] max-w-[360px] overflow-y-auto border-l border-border/70 bg-background p-0"
          >
            <SheetHeader className="border-b border-border/70 px-6 pt-6 pb-4">
              <SheetTitle className="text-left font-serif text-2xl tracking-[0.02em]">
                Πλοήγηση
              </SheetTitle>
              <SheetDescription className="sr-only">
                Επιλέξτε σελίδα ή μεταβείτε στην επικοινωνία.
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-4 px-6 py-6">
              {site.nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    "rounded-md py-1 text-[1.85rem] leading-tight text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                    isActive(item.href) && "text-foreground"
                  )}
                  aria-current={isActive(item.href) ? "page" : undefined}
                >
                  {item.label}
                </Link>
              ))}
              <Button asChild className="mt-4 w-full">
                <Link href="/contact" onClick={() => setIsMenuOpen(false)}>
                  Κλείστε συνάντηση
                </Link>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}

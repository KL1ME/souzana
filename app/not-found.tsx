import Link from "next/link"
import { Button } from "@/components/ui/button"
import Container from "@/components/layout/Container"

export default function NotFound() {
  return (
    <div className="pb-24">
      <section className="py-24 sm:py-32">
        <Container className="flex flex-col items-start gap-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            404
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl font-serif">
            Η σελίδα δεν βρέθηκε
          </h1>
          <p className="text-base text-muted-foreground max-w-xl">
            Το περιεχόμενο που αναζητάτε δεν είναι διαθέσιμο. Επιστρέψτε στην
            αρχική σελίδα.
          </p>
          <Button asChild size="lg">
            <Link href="/">Επιστροφή στην αρχική</Link>
          </Button>
        </Container>
      </section>
    </div>
  )
}

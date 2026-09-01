"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { pages, practiceAreas, site } from "@/lib/content"

const initialState = {
  fullName: "",
  email: "",
  phone: "",
  practiceArea: "",
  message: "",
  consent: false,
}

export default function ContactForm() {
  const [values, setValues] = useState(initialState)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<"idle" | "opened">("idle")

  const mailSubject = values.practiceArea
    ? `Αίτημα επικοινωνίας — ${values.practiceArea}`
    : "Αίτημα επικοινωνίας από την ιστοσελίδα"
  const mailBody = [
    `Ονοματεπώνυμο: ${values.fullName}`,
    `Email: ${values.email}`,
    values.phone ? `Τηλέφωνο: ${values.phone}` : null,
    values.practiceArea ? `Τομέας ενδιαφέροντος: ${values.practiceArea}` : null,
    "",
    "Μήνυμα:",
    values.message,
  ]
    .filter((line): line is string => line !== null)
    .join("\n")
  const mailtoHref = `mailto:${site.contact.email}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`

  const validate = () => {
    const nextErrors: Record<string, string> = {}
    if (!values.fullName.trim()) {
      nextErrors.fullName = "Παρακαλώ συμπληρώστε το ονοματεπώνυμο."
    }
    if (!values.email.trim()) {
      nextErrors.email = "Παρακαλώ συμπληρώστε το email."
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      nextErrors.email = "Το email δεν φαίνεται έγκυρο."
    }
    if (!values.message.trim()) {
      nextErrors.message = "Παρακαλώ γράψτε ένα σύντομο μήνυμα."
    }
    if (!values.consent) {
      nextErrors.consent = "Απαιτείται συγκατάθεση για την επεξεργασία."
    }
    return nextErrors
  }

  const handleChange = (key: keyof typeof initialState, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    window.location.href = mailtoHref
    setStatus("opened")
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fullName">Ονοματεπώνυμο *</Label>
          <Input
            id="fullName"
            name="fullName"
            autoComplete="name"
            value={values.fullName}
            onChange={(event) => handleChange("fullName", event.target.value)}
            placeholder="Ονοματεπώνυμο"
            required
            aria-invalid={Boolean(errors.fullName)}
            aria-describedby={errors.fullName ? "fullName-error" : undefined}
          />
          {errors.fullName ? (
            <p id="fullName-error" className="text-xs text-destructive">
              {errors.fullName}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(event) => handleChange("email", event.target.value)}
            placeholder="name@company.com"
            required
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email ? (
            <p id="email-error" className="text-xs text-destructive">
              {errors.email}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Τηλέφωνο</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={values.phone}
            onChange={(event) => handleChange("phone", event.target.value)}
            placeholder="Προαιρετικά"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="practiceArea">Τομέας ενδιαφέροντος</Label>
          <Select
            name="practiceArea"
            value={values.practiceArea}
            onValueChange={(value) => handleChange("practiceArea", value)}
          >
            <SelectTrigger id="practiceArea" aria-label="Τομέας ενδιαφέροντος">
              <SelectValue placeholder="Επιλέξτε τομέα" />
            </SelectTrigger>
            <SelectContent>
              {practiceAreas.map((area) => (
                <SelectItem key={area.slug} value={area.title}>
                  {area.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Μήνυμα *</Label>
        <Textarea
          id="message"
          name="message"
          value={values.message}
          onChange={(event) => handleChange("message", event.target.value)}
          placeholder="Περιγράψτε συνοπτικά την ανάγκη σας..."
          rows={6}
          maxLength={3000}
          required
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? "message-error" : undefined}
        />
        {errors.message ? (
          <p id="message-error" className="text-xs text-destructive">
            {errors.message}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <Checkbox
            id="consent"
            name="consent"
            checked={values.consent}
            onCheckedChange={(checked) => handleChange("consent", Boolean(checked))}
            aria-invalid={Boolean(errors.consent)}
            aria-describedby={errors.consent ? "consent-error" : undefined}
          />
          <Label htmlFor="consent" className="text-sm text-muted-foreground">
            {pages.contact.consentText}
            <Link href="/privacy" className="ml-1 underline underline-offset-4">
              Πολιτική Απορρήτου
            </Link>
            .
          </Label>
        </div>
        {errors.consent ? (
          <p id="consent-error" className="text-xs text-destructive">
            {errors.consent}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" size="lg" className="w-full sm:w-auto">
          Συνέχεια στο email
        </Button>
        {status === "opened" ? (
          <p className="text-sm leading-relaxed text-foreground" role="status" aria-live="polite">
            {pages.contact.successMessage}{" "}
            <a href={mailtoHref} className="underline decoration-accent underline-offset-4">
              Ανοίξτε το ξανά
            </a>
            .
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {site.legal.message}
          </p>
        )}
      </div>
    </form>
  )
}

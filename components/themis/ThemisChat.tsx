"use client"

import * as Dialog from "@radix-ui/react-dialog"
import { ArrowRight, ArrowUp, ArrowUpRight, LoaderCircle, RotateCcw, X } from "lucide-react"
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { cn } from "@/lib/utils"
import { themis, THEMIS_MAX_CONVERSATION_LENGTH, THEMIS_MAX_HISTORY, THEMIS_MAX_MESSAGE_LENGTH, type ThemisMessage } from "@/lib/themis"
import { requestThemisAnswer, warmThemisApi, ThemisRequestError } from "@/lib/themis-client"
import { trackThemisViewport } from "@/lib/themis-viewport"
import ThemisReply from "./ThemisReply"

const endpoint = process.env.NEXT_PUBLIC_THEMIS_API_URL?.trim()
const preview = process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_THEMIS_PREVIEW === "true"
const invitationDismissedKey = "souzana-themis-invitation-dismissed"
type PendingRequest = { controller: AbortController; previousMessages: ThemisMessage[]; draft: string }

export default function ThemisChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ThemisMessage[]>([])
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [waitStage, setWaitStage] = useState<"waiting" | "slow" | "long">("waiting")
  const [error, setError] = useState("")
  const [showInvitation, setShowInvitation] = useState(false)
  const [panel, setPanel] = useState<HTMLDivElement | null>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const invitationTimerRef = useRef<number | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const conversationRef = useRef<HTMLDivElement>(null)
  const requestRef = useRef<PendingRequest | null>(null)
  const warmupAtRef = useRef<number | null>(null)

  useEffect(() => () => requestRef.current?.controller.abort(), [])

  useEffect(() => {
    if (!sending) {
      inputRef.current?.focus()
      return
    }
    const slow = window.setTimeout(() => setWaitStage("slow"), 12_000)
    const long = window.setTimeout(() => setWaitStage("long"), 30_000)
    return () => {
      window.clearTimeout(slow)
      window.clearTimeout(long)
    }
  }, [sending])

  useLayoutEffect(() => {
    if (open && panel) return trackThemisViewport(panel, conversationRef.current)
  }, [open, panel])

  useEffect(() => {
    if (!endpoint) return
    try {
      if (window.sessionStorage.getItem(invitationDismissedKey)) return
    } catch {
      // The launcher also works when browser storage is unavailable.
    }
    const timer = window.setTimeout(() => {
      invitationTimerRef.current = null
      setShowInvitation(true)
    }, 3500)
    invitationTimerRef.current = timer
    return () => window.clearTimeout(timer)
  }, [])

  function dismissInvitation() {
    if (invitationTimerRef.current !== null) {
      window.clearTimeout(invitationTimerRef.current)
      invitationTimerRef.current = null
    }
    setShowInvitation(false)
    try {
      window.sessionStorage.setItem(invitationDismissedKey, "1")
    } catch {
      // Dismiss the invitation for this page even without browser storage.
    }
  }

  function changeOpen(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen) dismissInvitation()
  }

  function chooseStarter(question: string) {
    setDraft(question)
    inputRef.current?.focus()
  }

  useEffect(() => {
    if (!open || !endpoint || preview) return
    const now = Date.now()
    if (warmupAtRef.current !== null && now - warmupAtRef.current < 5 * 60_000) return
    warmupAtRef.current = now
    void warmThemisApi(endpoint)
  }, [open])

  useEffect(() => {
    if (open && conversationRef.current) {
      conversationRef.current.scrollTop = messages.length || sending || error ? conversationRef.current.scrollHeight : 0
    }
  }, [messages, sending, error, open, waitStage])

  async function sendMessage(content: string) {
    const text = content.trim()
    if (!endpoint || !text || requestRef.current || text.length > THEMIS_MAX_MESSAGE_LENGTH) return

    const history: ThemisMessage[] = [
      ...messages.slice(-(THEMIS_MAX_HISTORY - 1)),
      { role: "user", content: text },
    ]
    while (history.reduce((total, message) => total + message.content.length, 0) > THEMIS_MAX_CONVERSATION_LENGTH) {
      history.splice(0, 2)
    }
    const controller = new AbortController()
    const request: PendingRequest = { controller, previousMessages: messages, draft: content }
    requestRef.current = request
    setMessages([...messages, { role: "user", content: text }])
    setDraft("")
    setError("")
    setWaitStage("waiting")
    setSending(true)

    try {
      const result = await requestThemisAnswer(endpoint, history, controller.signal)
      if (requestRef.current !== request || controller.signal.aborted) return
      setMessages([...messages, { role: "user", content: text }, { role: "assistant", content: result.reply, sources: result.sources, citations: result.citations }])
    } catch (failure) {
      if (requestRef.current !== request || controller.signal.aborted) return
      setMessages(messages)
      setDraft(request.draft)
      setError(failure instanceof Error && failure.message === "busy"
        ? failure instanceof ThemisRequestError && failure.retryAfterSeconds
          ? `Η THEMIS δέχεται αρκετά μηνύματα αυτή τη στιγμή. Δοκιμάστε ξανά σε ${failure.retryAfterSeconds} ${failure.retryAfterSeconds === 1 ? "δευτερόλεπτο" : "δευτερόλεπτα"}.`
          : "Η THEMIS δέχεται αρκετά μηνύματα αυτή τη στιγμή. Δοκιμάστε ξανά."
        : failure instanceof Error && (failure.message === "timeout" || failure.name === "TimeoutError")
          ? "Η απάντηση άργησε περισσότερο από το αναμενόμενο. Το μήνυμά σας παραμένει εδώ για να δοκιμάσετε ξανά."
        : failure instanceof Error && failure.message === "not_configured"
          ? "Η THEMIS δεν έχει ενεργοποιηθεί ακόμη. Το μήνυμά σας παραμένει εδώ για να δοκιμάσετε ξανά μόλις ολοκληρωθεί η σύνδεση."
        : "Η αποστολή δεν ολοκληρώθηκε. Το μήνυμά σας παραμένει εδώ για να δοκιμάσετε ξανά.")
    } finally {
      if (requestRef.current === request) {
        requestRef.current = null
        setSending(false)
      }
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendMessage(draft)
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      void sendMessage(draft)
    }
  }

  function reset() {
    const request = requestRef.current
    requestRef.current = null
    request?.controller.abort()
    setSending(false)
    setMessages([])
    setDraft("")
    setError("")
    inputRef.current?.focus()
  }

  function stopWaiting() {
    const request = requestRef.current
    if (!request) return
    requestRef.current = null
    request.controller.abort()
    setMessages(request.previousMessages)
    setDraft(request.draft)
    setSending(false)
    setError("Η αναμονή σταμάτησε. Το μήνυμά σας παραμένει εδώ για να το στείλετε ξανά όταν θελήσετε.")
  }

  return (
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <div className="themis-launcher">
        {showInvitation && !open && (
          <div className="themis-invitation">
            <button
              type="button"
              onClick={dismissInvitation}
              className="themis-invitation-close"
              aria-label="Απόκρυψη πρόσκλησης THEMIS"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => changeOpen(true)}
              className="themis-invitation-content"
              aria-label="Γνωρίστε τη THEMIS, την ψηφιακή βοηθό της εταιρείας"
              aria-haspopup="dialog"
              aria-controls="themis-dialog"
            >
              <span className="themis-invitation-title">{themis.invitation.title}</span>
              <span className="themis-invitation-description">{themis.invitation.description}</span>
              <span className="themis-invitation-action">
                {themis.invitation.action}
                <ArrowRight className="size-4" aria-hidden="true" />
              </span>
            </button>
          </div>
        )}
        <Dialog.Trigger asChild>
          <button
            type="button"
            className="themis-launch-button"
            aria-controls="themis-dialog"
            aria-label={endpoint ? "Ρωτήστε τη THEMIS, την ψηφιακή βοηθό μας" : "Γνωρίστε τη THEMIS, την ψηφιακή βοηθό μας"}
          >
            <span className="themis-monogram" aria-hidden="true">T</span>
            <span className="themis-launch-copy">
              <span className="themis-launch-title">{endpoint ? "Ρωτήστε τη THEMIS" : "Γνωρίστε τη THEMIS"}</span>
              <span className="themis-launch-subtitle">Η ψηφιακή βοηθός μας</span>
            </span>
            <ArrowUpRight className="size-4 shrink-0" aria-hidden="true" />
          </button>
        </Dialog.Trigger>
      </div>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-white/60 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          id="themis-dialog"
          ref={setPanel}
          className="themis-panel z-50 flex flex-col overflow-hidden rounded-xl border border-accent bg-white text-black shadow-sm outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-3"
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            if (endpoint && (messages.length || draft)) inputRef.current?.focus()
            else titleRef.current?.focus()
          }}
        >
          <div className="flex shrink-0 items-center gap-2 border-b border-accent/30 px-5 py-3">
            <div className="flex-1">
              <Dialog.Title ref={titleRef} tabIndex={-1} className="text-xs font-semibold tracking-[0.2em] outline-none">{themis.name}</Dialog.Title>
              <Dialog.Description className="mt-1 text-[11px] text-[#6d685e]">{themis.subtitle}</Dialog.Description>
              {preview && <p className="mt-1 text-[10px]">Ενδεικτική προεπισκόπηση</p>}
            </div>
            <button type="button" onClick={reset} disabled={!messages.length && !draft && !error && !sending}
              className="flex size-11 items-center justify-center rounded-lg transition-colors hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-30"
              aria-label="Νέα συνομιλία">
              <RotateCcw className="size-4 text-[#806321]" aria-hidden="true" />
            </button>
            <Dialog.Close className="flex size-11 items-center justify-center rounded-lg transition-colors hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label="Κλείσιμο THEMIS">
              <X className="size-5 text-[#806321]" aria-hidden="true" />
            </Dialog.Close>
          </div>

          <div ref={conversationRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
            {!endpoint && <p role="status" className="text-xs leading-relaxed">Η συνομιλία θα είναι διαθέσιμη σύντομα.</p>}
            {!messages.length && endpoint && (
              <div className="themis-welcome">
                <span className="themis-welcome-monogram" aria-hidden="true">T</span>
                <h2 className="font-serif text-[1.9rem] leading-tight text-[#17212a]">Πώς μπορώ να σας βοηθήσω;</h2>
                <p className="mt-3 text-sm leading-relaxed text-[#6d685e]">
                  Επιλέξτε ένα θέμα ή γράψτε τη δική σας ερώτηση.
                </p>
                <div className="mt-6 divide-y divide-accent/20 border-y border-accent/20">
                  {themis.starters.map((starter) => (
                    <button
                      key={starter.label}
                      type="button"
                      onClick={() => chooseStarter(starter.question)}
                      className="themis-starter"
                    >
                      <span>{starter.label}</span>
                      <ArrowRight className="size-4 text-[#806321]" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div role="log" aria-label="Μηνύματα συνομιλίας" aria-live="polite" aria-relevant="additions" className="space-y-4">
              {messages.map((message, index) => (
                <div key={index} className={cn("flex flex-col gap-1.5", message.role === "user" ? "items-end" : "items-start")}>
                  <span className="px-1 text-[10px] font-medium tracking-wide">{message.role === "user" ? "Εσείς" : "THEMIS"}</span>
                  <div className={cn("max-w-[92%] rounded-xl border border-accent/30 bg-white px-4 py-3 text-sm leading-relaxed break-words [overflow-wrap:anywhere]",
                    message.role === "user" ? "rounded-br-sm" : "rounded-bl-sm")}>
                    {message.role === "user" ? <p className="whitespace-pre-wrap">{message.content}</p> : <ThemisReply message={message} onInternalSource={() => setOpen(false)} />}
                  </div>
                </div>
              ))}
            </div>
            {sending && (
              <div className="mt-4 space-y-2">
                <p role="status" className="flex items-start gap-2 text-xs leading-relaxed">
                  <LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin text-[#806321]" aria-hidden="true" />
                  <span>{waitStage === "waiting" ? "Αναμονή απάντησης από τη THEMIS…"
                    : waitStage === "slow" ? "Η απάντηση χρειάζεται περισσότερο χρόνο. Συνεχίζουμε να περιμένουμε τη THEMIS…"
                    : "Η απάντηση καθυστερεί. Μπορείτε να διακόψετε την αναμονή· η ερώτησή σας θα παραμείνει στο πεδίο μηνύματος."}</span>
                </p>
                <button type="button" onClick={stopWaiting}
                  className="min-h-10 rounded-md px-2 text-xs text-[#806321] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  Διακοπή αναμονής
                </button>
              </div>
            )}
            {error && <p role="alert" className="mt-4 rounded-lg border border-accent/30 bg-white p-3 text-xs leading-relaxed">{error}</p>}
          </div>

          <form onSubmit={submit} className="relative mx-4 mb-[max(16px,env(safe-area-inset-bottom))] shrink-0">
            <label htmlFor="themis-message" className="sr-only">Το μήνυμά σας προς τη THEMIS</label>
            <textarea id="themis-message" ref={inputRef} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={onKeyDown}
              rows={2} maxLength={THEMIS_MAX_MESSAGE_LENGTH} disabled={!endpoint || sending}
              placeholder={endpoint ? "Γράψτε το μήνυμά σας…" : "Διαθέσιμο σύντομα"}
              className="block min-h-20 w-full resize-none rounded-lg border border-accent/40 bg-white py-3 pr-14 pl-3 text-base leading-relaxed text-black placeholder:text-black focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-60 sm:text-sm" />
            <button type="submit" disabled={!endpoint || !draft.trim() || sending} aria-label="Αποστολή μηνύματος"
              className="absolute right-2 bottom-2 flex size-11 items-center justify-center rounded-lg border border-accent bg-white transition-colors hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-30">
              <ArrowUp className="size-5 text-[#806321]" aria-hidden="true" />
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

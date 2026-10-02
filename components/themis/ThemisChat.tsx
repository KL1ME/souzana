"use client"

import * as Dialog from "@radix-ui/react-dialog"
import { ArrowUp, LoaderCircle, RotateCcw, X } from "lucide-react"
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { cn } from "@/lib/utils"
import { themis, THEMIS_MAX_CONVERSATION_LENGTH, THEMIS_MAX_HISTORY, THEMIS_MAX_MESSAGE_LENGTH, type ThemisMessage } from "@/lib/themis"

const endpoint = process.env.NEXT_PUBLIC_THEMIS_API_URL?.trim()
const preview = process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_THEMIS_PREVIEW === "true"

export default function ThemisChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ThemisMessage[]>([])
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const conversationRef = useRef<HTMLDivElement>(null)
  const requestRef = useRef<AbortController | null>(null)

  useEffect(() => () => requestRef.current?.abort(), [])

  useEffect(() => {
    if (open && conversationRef.current) {
      conversationRef.current.scrollTop = messages.length || sending || error ? conversationRef.current.scrollHeight : 0
    }
  }, [messages, sending, error, open])

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
    requestRef.current = controller
    setMessages([...messages, { role: "user", content: text }])
    setDraft("")
    setError("")
    setSending(true)

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
        credentials: "omit",
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(45_000)]),
      })
      if (!response.ok) {
        throw new Error(response.status === 429 ? "busy" : "unavailable")
      }
      const result: unknown = await response.json()
      if (
        !result || typeof result !== "object" || !("reply" in result) ||
        typeof result.reply !== "string" || !result.reply.trim() || result.reply.length > 6000
      ) {
        throw new Error("unavailable")
      }
      setMessages([...messages, { role: "user", content: text }, { role: "assistant", content: result.reply.trim() }])
    } catch (failure) {
      if (controller.signal.aborted) return
      setMessages(messages)
      setDraft(text)
      setError(failure instanceof Error && failure.message === "busy"
        ? "Η THEMIS δέχεται αρκετά μηνύματα αυτή τη στιγμή. Δοκιμάστε ξανά σε λίγο."
        : "Η αποστολή δεν ολοκληρώθηκε. Το μήνυμά σας παραμένει εδώ για να δοκιμάσετε ξανά.")
    } finally {
      if (requestRef.current === controller) {
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
    setMessages([])
    setDraft("")
    setError("")
    inputRef.current?.focus()
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="fixed right-4 bottom-5 z-40 flex min-h-12 items-center justify-center rounded-xl border border-accent bg-white px-6 py-3 text-xs font-semibold tracking-[0.2em] text-[#806321] shadow-sm transition-colors hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 sm:right-7 sm:bottom-7"
          aria-label="Συνομιλήστε με τη THEMIS"
        >
          THEMIS
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-white/60 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed inset-x-3 bottom-3 z-50 flex h-[min(560px,calc(100dvh-24px))] flex-col overflow-hidden rounded-xl border border-accent bg-white text-[#806321] shadow-sm outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-3 sm:inset-x-auto sm:right-7 sm:bottom-7 sm:w-[420px]"
          onOpenAutoFocus={endpoint ? (event) => { event.preventDefault(); inputRef.current?.focus() } : undefined}
        >
          <div className="flex shrink-0 items-center gap-2 border-b border-accent/30 px-5 py-3">
            <div className="flex-1">
              <Dialog.Title className="text-xs font-semibold tracking-[0.2em]">{themis.name}</Dialog.Title>
              <Dialog.Description className="sr-only">{themis.subtitle}</Dialog.Description>
              {preview && <p className="mt-1 text-[10px]">Ενδεικτική προεπισκόπηση</p>}
            </div>
            <button type="button" onClick={reset} disabled={sending || !messages.length}
              className="flex size-11 items-center justify-center rounded-lg transition-colors hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-30"
              aria-label="Νέα συνομιλία">
              <RotateCcw className="size-4" aria-hidden="true" />
            </button>
            <Dialog.Close className="flex size-11 items-center justify-center rounded-lg transition-colors hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label="Κλείσιμο THEMIS">
              <X className="size-5" aria-hidden="true" />
            </Dialog.Close>
          </div>

          <div ref={conversationRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
            {!endpoint && <p role="status" className="text-xs leading-relaxed">Η συνομιλία θα είναι διαθέσιμη σύντομα.</p>}
            <div role="log" aria-label="Μηνύματα συνομιλίας" aria-live="polite" aria-relevant="additions" className="space-y-4">
              {messages.map((message, index) => (
                <div key={index} className={cn("flex flex-col gap-1.5", message.role === "user" ? "items-end" : "items-start")}>
                  <span className="px-1 text-[10px] font-medium tracking-wide">{message.role === "user" ? "Εσείς" : "THEMIS"}</span>
                  <p className={cn("max-w-[92%] rounded-xl border border-accent/30 bg-white px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]",
                    message.role === "user" ? "rounded-br-sm" : "rounded-bl-sm")}>{message.content}</p>
                </div>
              ))}
            </div>
            {sending && <p role="status" className="mt-4 flex items-center gap-2 text-xs"><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />Η THEMIS ετοιμάζει την απάντησή σας…</p>}
            {error && <p role="alert" className="mt-4 rounded-lg border border-accent/30 bg-white p-3 text-xs leading-relaxed">{error}</p>}
          </div>

          <form onSubmit={submit} className="relative mx-4 mb-[max(16px,env(safe-area-inset-bottom))] shrink-0">
            <label htmlFor="themis-message" className="sr-only">Το μήνυμά σας προς τη THEMIS</label>
            <textarea id="themis-message" ref={inputRef} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={onKeyDown}
              rows={2} maxLength={THEMIS_MAX_MESSAGE_LENGTH} disabled={!endpoint || sending}
              placeholder={endpoint ? "Γράψτε το μήνυμά σας…" : "Διαθέσιμο σύντομα"}
              className="block min-h-20 w-full resize-none rounded-lg border border-accent/40 bg-white py-3 pr-14 pl-3 text-base leading-relaxed placeholder:text-[#806321]/70 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-60 sm:text-sm" />
            <button type="submit" disabled={!endpoint || !draft.trim() || sending} aria-label="Αποστολή μηνύματος"
              className="absolute right-2 bottom-2 flex size-11 items-center justify-center rounded-lg border border-accent bg-white transition-colors hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-30">
              <ArrowUp className="size-5" aria-hidden="true" />
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

import { useEffect, useRef, useState } from 'react'
import { MessageCircle, Send, X } from 'lucide-react'

import { useT } from '@/i18n'

interface Msg {
  role: 'user' | 'assistant'
  content: string
  sources?: { slug: string; title: string }[]
}

// ponytail: no streaming, no server history — full history rides each request (max 6 turns server-side)
export default function TrendingChat() {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [key, setKey] = useState(() => sessionStorage.getItem('tc_key') || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [msgs, loading])

  async function ask() {
    const q = input.trim()
    if (!q || loading) return
    if (!key.trim()) { setError(t['tc.needkey']); return }
    setInput('')
    setError('')
    const history = msgs.map(m => ({ role: m.role, content: m.content }))
    setMsgs(m => [...m, { role: 'user', content: q }])
    setLoading(true)
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-chat-key': key.trim() },
        body: JSON.stringify({ question: q, history }),
      })
      const data = await r.json()
      if (r.status === 401) { setError(t['tc.badkey']); setLoading(false); return }
      if (!r.ok) throw new Error(data.error || t['tc.error'])
      sessionStorage.setItem('tc_key', key.trim())
      setMsgs(m => [...m, { role: 'assistant', content: data.answer, sources: data.sources }])
    } catch (e) {
      setError(e instanceof Error ? e.message : t['tc.error'])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {!open && (
        <button
          aria-label={t['tc.open']}
          className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand)] text-white shadow-lg transition hover:scale-105"
          onClick={() => setOpen(true)}
          type="button"
        >
          <MessageCircle className="h-6 w-6" aria-hidden="true" />
        </button>
      )}
      {open && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex h-[70vh] flex-col rounded-t-2xl border border-[var(--surface-border)] bg-[var(--surface)] shadow-2xl sm:inset-x-auto sm:bottom-5 sm:right-5 sm:h-[560px] sm:w-[400px] sm:rounded-2xl" role="dialog" aria-label={t['tc.title']}>
          <div className="flex items-center justify-between border-b border-[var(--surface-border)] px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-950">{t['tc.title']}</h2>
            <button aria-label={t['tc.close']} className="rounded p-1 text-slate-500 hover:bg-slate-100" onClick={() => setOpen(false)} type="button">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {msgs.length === 0 && <p className="text-sm text-slate-500">{t['tc.intro']}</p>}
            {msgs.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
                <div className={`inline-block max-w-[90%] rounded-xl px-3 py-2 text-sm leading-6 ${m.role === 'user' ? 'bg-[var(--brand)] text-left text-white' : 'bg-[var(--surface-muted)] text-left text-slate-800'}`}>
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.sources.map(s => (
                        <a key={s.slug} className="rounded bg-white px-2 py-0.5 text-xs text-[var(--brand)] underline underline-offset-2" href={`/trending/${s.slug}`}>{s.slug}</a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && <p className="text-sm text-slate-500" role="status">{t['tc.thinking']}</p>}
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          </div>
          <form className="flex gap-2 border-t border-[var(--surface-border)] p-3" onSubmit={e => { e.preventDefault(); ask() }}>
            <input
              aria-label={t['tc.key']}
              className="w-28 rounded-lg border border-[var(--surface-border)] bg-white px-2 py-2 text-sm outline-none focus:border-[var(--brand)]"
              maxLength={64}
              onChange={e => setKey(e.target.value)}
              placeholder={t['tc.key']}
              value={key}
            />
            <input
              className="min-w-0 flex-1 rounded-lg border border-[var(--surface-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
              maxLength={500}
              onChange={e => setInput(e.target.value)}
              placeholder={t['tc.placeholder']}
              value={input}
            />
            <button aria-label={t['tc.send']} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--brand)] text-white disabled:opacity-50" disabled={loading || !input.trim()} type="submit">
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
          <p className="px-4 pb-2 text-[11px] text-slate-400">{t['tc.disclaimer']}</p>
        </div>
      )}
    </>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Play, X } from 'lucide-react'

import { useT } from '@/i18n'
import { isPublished, parseReport, type Report } from '@/lib/reports'

// ponytail: no pagination; add when the catalog passes ~100 videos
function ytId(md: string): string {
  return md.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/)?.[1] || ''
}

export default function AmbiencePage() {
  const [items, setItems] = useState<Report[]>([])
  const [ids, setIds] = useState<Record<string, string>>({})
  const [playing, setPlaying] = useState('')
  const [loaded, setLoaded] = useState(false)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const refocus = useRef('')
  const t = useT()

  useEffect(() => {
    const modules = import.meta.glob('/docs/ambience/*.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>
    Promise.allSettled(
      Object.entries(modules).map(async ([path, loader]) => {
        const raw = await loader()
        const slug = path.split('/').pop()?.replace('.md', '') || path
        // ambience default category is "Ambience" (docs/AMBIENCE_FORMAT.md), not parseReport's "Engineering"
        const report = parseReport(slug, /Category:/i.test(raw) ? raw : `${raw}\nCategory: Ambience`)
        return { report, id: ytId(raw) }
      })
    ).then((results) => {
      const ok = results
        .filter((r): r is PromiseFulfilledResult<{ report: Report; id: string }> => r.status === 'fulfilled')
        .map(r => r.value)
      setIds(Object.fromEntries(ok.map(x => [x.report.slug, x.id])))
      setItems(ok.map(x => x.report).filter(isPublished).sort((a, b) => b.date.localeCompare(a.date)))
    }).finally(() => setLoaded(true))
  }, [])

  // poster button and iframe unmount each other on swap — carry focus across the remount
  useEffect(() => {
    if (playing) { frameRef.current?.focus(); return }
    if (!refocus.current) return
    document.querySelector<HTMLButtonElement>(`[data-play="${refocus.current}"]`)?.focus()
    refocus.current = ''
  }, [playing])

  return (
    <div className="pb-20">
      <section className="relative overflow-hidden">
        <div className="layout-grid space-y-8 py-16 lg:py-24">
          <div className="max-w-3xl space-y-4">
            <span className="eyebrow">{t['am.eyebrow']}</span>
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              {t['am.title']}
            </h1>
            <p className="text-lg leading-8 text-slate-600">{t['am.desc']}</p>
          </div>

          {!loaded && <p className="panel-soft text-slate-600" role="status">{t['am.loading']}</p>}
          {loaded && items.length === 0 && <p className="panel-soft text-slate-600" role="status">{t['am.empty']}</p>}

          {loaded && items.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2">
              {items.map((item) => {
                const id = ids[item.slug]
                return (
                  <article key={item.slug} className="panel-surface flex flex-col overflow-hidden p-0">
                    {id && (
                      playing === item.slug ? (
                        <div className="relative aspect-video w-full">
                          <iframe
                            ref={frameRef}
                            allow="autoplay; encrypted-media; picture-in-picture"
                            allowFullScreen
                            className="h-full w-full"
                            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`}
                            title={item.title}
                          />
                          <button
                            aria-label={t['am.close']}
                            className="absolute right-3 top-3 z-10 flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lg transition hover:bg-white"
                            onClick={() => { refocus.current = item.slug; setPlaying('') }}
                            type="button"
                          >
                            <X className="h-5 w-5" aria-hidden="true" />
                          </button>
                        </div>
                      ) : (
                        <button
                          aria-label={t['am.play'](item.title)}
                          className="group relative block aspect-video w-full cursor-pointer bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)]"
                          data-play={item.slug}
                          onClick={() => setPlaying(item.slug)}
                          type="button"
                        >
                          <img
                            alt=""
                            className="h-full w-full object-cover transition group-hover:opacity-90"
                            loading="lazy"
                            src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
                          />
                          <span className="absolute inset-0 flex items-center justify-center">
                            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg transition group-hover:scale-105">
                              <Play className="ml-1 h-6 w-6 text-slate-900" aria-hidden="true" />
                            </span>
                          </span>
                        </button>
                      )
                    )}
                    <div className="mt-auto space-y-2 p-5 sm:p-6">
                      <h2 className="text-lg font-semibold text-slate-950">{item.title}</h2>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                        <span>{item.date}</span>
                        <span className="rounded bg-[var(--surface-muted)] px-2 py-0.5 text-xs font-medium text-slate-600">{item.category}</span>
                      </div>
                      {item.summary && <p className="text-sm leading-6 text-slate-500 line-clamp-3">{item.summary}</p>}
                      {id && (
                        <a
                          className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-[var(--brand)] underline underline-offset-2"
                          href={`https://youtu.be/${id}`}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          {t['am.watch']}
                          <span className="sr-only">({t['am.external']})</span>
                        </a>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          {loaded && items.length > 0 && <p className="text-sm text-slate-600">{t['am.count'](items.length)}</p>}
        </div>
      </section>
    </div>
  )
}

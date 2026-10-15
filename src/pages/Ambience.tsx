import { useEffect, useState } from 'react'
import { Play } from 'lucide-react'

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
  const t = useT()

  useEffect(() => {
    const modules = import.meta.glob('/docs/ambience/*.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>
    Promise.allSettled(
      Object.entries(modules).map(async ([path, loader]) => {
        const raw = await loader()
        const slug = path.split('/').pop()?.replace('.md', '') || path
        return { report: parseReport(slug, raw), id: ytId(raw) }
      })
    ).then((results) => {
      const ok = results
        .filter((r): r is PromiseFulfilledResult<{ report: Report; id: string }> => r.status === 'fulfilled')
        .map(r => r.value)
      setIds(Object.fromEntries(ok.map(x => [x.report.slug, x.id])))
      setItems(ok.map(x => x.report).filter(isPublished).sort((a, b) => b.date.localeCompare(a.date)))
    }).finally(() => setLoaded(true))
  }, [])

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

          {!loaded && <p className="text-slate-600">{t['am.loading']}</p>}
          {loaded && items.length === 0 && <p className="text-slate-600">{t['am.empty']}</p>}

          <div className="grid gap-6 sm:grid-cols-2">
            {items.map((item) => {
              const id = ids[item.slug]
              return (
                <article key={item.slug} className="panel-surface overflow-hidden">
                  {id && (
                    playing === item.slug ? (
                      <div className="aspect-video w-full">
                        <iframe
                          allow="autoplay; encrypted-media; picture-in-picture"
                          allowFullScreen
                          className="h-full w-full"
                          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`}
                          title={item.title}
                        />
                      </div>
                    ) : (
                      <button
                        aria-label={item.title}
                        className="group relative block aspect-video w-full cursor-pointer bg-slate-900"
                        onClick={() => setPlaying(item.slug)}
                        type="button"
                      >
                        <img
                          alt={item.title}
                          className="h-full w-full object-cover transition group-hover:opacity-90"
                          loading="lazy"
                          src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
                        />
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg transition group-hover:scale-105">
                            <Play className="ml-1 h-6 w-6 text-slate-900" />
                          </span>
                        </span>
                      </button>
                    )
                  )}
                  <div className="space-y-2 p-5">
                    <h2 className="text-lg font-semibold text-slate-950">{item.title}</h2>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                      <span>{item.date}</span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{item.category}</span>
                    </div>
                    {item.summary && <p className="text-sm leading-6 text-slate-500 line-clamp-3">{item.summary}</p>}
                    {id && (
                      <a
                        className="inline-flex text-sm text-indigo-600 hover:underline"
                        href={`https://youtu.be/${id}`}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {t['am.watch']}
                      </a>
                    )}
                  </div>
                </article>
              )
            })}
          </div>

          {loaded && items.length > 0 && <p className="text-sm text-slate-600">{t['am.count'](items.length)}</p>}
        </div>
      </section>
    </div>
  )
}

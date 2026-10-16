import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Archive, ArrowRight } from 'lucide-react'

import { useT } from '@/i18n'
import { parseReport, type Report } from '@/lib/reports'

const PAGE_SIZE = 15

export default function TrendingPage() {
  const [items, setItems] = useState<Report[]>([])
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const t = useT()

  useEffect(() => {
    const daily = import.meta.glob('/docs/trending/*.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>
    const monthly = import.meta.glob('/docs/trending/monthly/*.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>
    const modules = { ...daily, ...monthly }

    Promise.allSettled(
      Object.entries(modules).map(async ([path, loader]) => {
        const raw = await loader()
        const slug = path.split('/').pop()?.replace('.md', '') || path
        return parseReport(slug, raw)
      })
    ).then((results) => {
      const parsed = results
        .filter((r): r is PromiseFulfilledResult<Report> => r.status === 'fulfilled')
        .map(r => r.value)
      // Both lists render date-desc; the page splits daily vs monthly itself.
      parsed.sort((a, b) => b.date.localeCompare(a.date))
      // All-rejected is a load failure, not an empty archive — surface it as such.
      if (parsed.length === 0 && results.some(r => r.status === 'rejected')) {
        setFailed(true)
        return
      }
      setItems(parsed)
    }).finally(() => setLoaded(true))
  }, [reloadKey])

  // Daily digests paginate as full cards; monthly archives render as compact
  // rows in their own section so they never crowd the daily list.
  const dailyItems = items.filter(i => !i.slug.startsWith('monthly'))
  const monthlyItems = items.filter(i => i.slug.startsWith('monthly'))
  const totalPages = Math.max(1, Math.ceil(dailyItems.length / PAGE_SIZE))
  const [page, setPage] = useState(1)
  const listRef = useRef<HTMLDivElement>(null)
  const safePage = Math.min(page, totalPages)
  const paginated = dailyItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <div className="pb-20">
      <section className="relative overflow-hidden">
        <div className="layout-grid space-y-8 py-16 lg:py-24">
          <div className="max-w-3xl space-y-4">
            <span className="eyebrow">{t['tr.eyebrow']}</span>
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              {t['tr.title']}
            </h1>
            <p className="text-lg leading-8 text-slate-600">
              {t['tr.desc']}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/trending/dashboard" className="button-secondary">
                {t['tr.dashboard']}
              </Link>
            </div>
          </div>

          {!loaded && <p className="panel-soft text-slate-600">{t['tr.loading']}</p>}
          {loaded && failed && (
            <div className="panel-soft flex flex-wrap items-center gap-4" role="alert">
              <p className="flex-1 text-slate-600">{t['tr.error']}</p>
              <button
                onClick={() => { setFailed(false); setReloadKey(k => k + 1) }}
                className="button-secondary"
              >
                {t['tr.retry']}
              </button>
            </div>
          )}
          {loaded && !failed && items.length === 0 && <p className="panel-soft text-slate-600">{t['tr.empty']}</p>}

          {paginated.length > 0 && (
          <div ref={listRef} className="scroll-mt-24 space-y-4">
            {paginated.map((item) => (
              <Link
                key={item.slug}
                to={`/trending/${item.slug}`}
                className="block panel-surface p-6 hover:bg-slate-50/50 transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <h2 className="text-lg font-semibold text-slate-950">{item.title}</h2>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                      <span>{item.date}</span>
                      <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">
                        {t['tr.daily']}
                      </span>
                    </div>
                    {item.summary && (
                      <p className="text-sm leading-6 text-slate-500 line-clamp-2">{item.summary}</p>
                    )}
                  </div>
                  <ArrowRight className="h-5 w-5 text-[var(--text-tertiary)] group-hover:text-slate-600 transition mt-1 flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>
          )}

          {monthlyItems.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t['tr.monthlySection']}</h2>
              {monthlyItems.map((item) => (
                <Link
                  key={item.slug}
                  to={`/trending/${item.slug}`}
                  className="flex items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-900"
                >
                  <Archive className="h-4 w-4 flex-shrink-0 text-slate-400" aria-hidden="true" />
                  <span className="font-medium">{item.title}</span>
                  <ArrowRight className="ml-auto h-4 w-4 flex-shrink-0 text-slate-400" aria-hidden="true" />
                </Link>
              ))}
            </div>
          )}

          {loaded && items.length > 0 && (
            <p className="text-sm text-slate-600">
              {t['tr.count'](items.length)}
            </p>
          )}

          {loaded && totalPages > 1 && (
            <nav className="flex flex-wrap items-center justify-center gap-3" aria-label={t['rep.pagination']}>
              <button
                onClick={() => { setPage(p => Math.max(1, p - 1)); listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
                disabled={safePage === 1}
                className="min-h-11 rounded-lg border border-[var(--border-soft)] bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-[var(--border-strong)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t['rep.prev']}
              </button>
              <span className="text-sm text-slate-500">
                {t['rep.page'](safePage, totalPages)}
              </span>
              <button
                onClick={() => { setPage(p => Math.min(totalPages, p + 1)); listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
                disabled={safePage === totalPages}
                className="min-h-11 rounded-lg border border-[var(--border-soft)] bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-[var(--border-strong)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t['rep.next']}
              </button>
            </nav>
          )}
        </div>
      </section>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

import { useT, useLang } from '@/i18n'
import { useSEO } from '@/hooks/useSEO'
import { parseReport, type Report } from '@/lib/reports'

const PAGE_SIZE = 15

export default function TrendingPage() {
  const [items, setItems] = useState<Report[]>([])
  const t = useT()
  const { lang } = useLang()

  useSEO('/trending', {
    title: t['tr.eyebrow'],
    description: t['tr.desc'],
  })

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
      parsed.sort((a, b) => b.date.localeCompare(a.date))
      setItems(parsed)
    })
  }, [])

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const [page, setPage] = useState(1)
  const safePage = Math.min(page, totalPages)
  const paginated = items.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

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
          </div>

          {items.length === 0 && <p className="text-slate-500">{t['tr.loading']}</p>}

          <div className="space-y-4">
            {paginated.map((item) => (
              <Link
                key={item.slug}
                to={`/trending/${item.slug}`}
                className="block panel-surface p-6 hover:bg-slate-50/50 transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <h3 className="text-lg font-semibold text-slate-950">{item.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                      <span>{item.date}</span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {item.category}
                      </span>
                    </div>
                    {item.summary && (
                      <p className="text-sm leading-6 text-slate-500 line-clamp-2">{item.summary}</p>
                    )}
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-slate-600 transition mt-1 flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>

          <p className="text-sm text-slate-400">
            {t['tr.count'](items.length)}
          </p>

          {totalPages > 1 && (
            <nav className="flex items-center justify-between gap-4" aria-label="Pagination">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="rounded-lg border border-[var(--border-soft)] bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-[var(--border-strong)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t['rep.prev']}
              </button>
              <span className="text-sm text-slate-500">
                {t['rep.page'](safePage, totalPages)}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="rounded-lg border border-[var(--border-soft)] bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-[var(--border-strong)] disabled:opacity-40 disabled:cursor-not-allowed"
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

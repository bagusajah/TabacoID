import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Filter } from 'lucide-react'

import { useT, useLang } from '@/i18n'
import { parseReport, decisionColors, reviewConfig, type Report } from '@/lib/reports'

interface Metrics {
  date: string
  job: string
  api_calls: number
  input_tokens: number
  output_tokens: number
  reasoning_tokens: number
  cache_tokens: number
}

function fmtK(n: number): string {
  return n >= 1000 ? `${Math.round(n / 1000)}k` : String(n)
}

const categories = ['All', 'Engineering', 'Experiments', 'Operations', 'Infrastructure', 'Architecture']

const PAGE_SIZE = 10

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [metrics, setMetrics] = useState<Metrics[]>([])
  const [filter, setFilter] = useState('All')
  const [page, setPage] = useState(1)
  const t = useT()
  const { lang } = useLang()

  useEffect(() => {
    const modules = import.meta.glob('/docs/reports/*.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>

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
      setReports(parsed)
    })

    fetch('/metrics.json').then(r => r.ok ? r.json() : []).then(setMetrics).catch(() => setMetrics([]))
  }, [])

  const dayTokens = (date: string) => metrics
    .filter(m => m.date === date)
    .reduce((a, m) => ({ in: a.in + m.input_tokens, out: a.out + m.output_tokens, calls: a.calls + m.api_calls }), { in: 0, out: 0, calls: 0 })

  const filtered = filter === 'All' ? reports : reports.filter(r => r.category.toLowerCase().includes(filter.toLowerCase()))

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <div className="pb-20">
      <section className="relative overflow-hidden">
        <div className="layout-grid space-y-8 py-16 lg:py-24">
          <div className="max-w-3xl space-y-4">
            <span className="eyebrow">{t['rep.eyebrow']}</span>
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              {t['rep.title']}
            </h1>
            <p className="text-lg leading-8 text-slate-600">
              {t['rep.desc']}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setFilter(cat)
                  setPage(1)
                }}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  filter === cat
                    ? 'bg-slate-950 text-white'
                    : 'border border-[var(--border-soft)] bg-white text-slate-600 hover:border-[var(--border-strong)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {reports.length === 0 && (
            <p className="text-slate-500">{t['rep.loading']}</p>
          )}

          <div className="space-y-4">
            {paginated.map((report) => (
              <Link
                key={report.slug}
                to={`/reports/${report.slug}`}
                className="block panel-surface p-6 hover:bg-slate-50/50 transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <h3 className="text-lg font-semibold text-slate-950">{report.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                      <span>{report.date}</span>
                      {(() => {
                        const tk = dayTokens(report.date)
                        return tk.calls > 0 && (
                          <span
                            className="rounded bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-600"
                            title={`${tk.calls} API calls · ${tk.in.toLocaleString()} in / ${tk.out.toLocaleString()} out tokens (all agent runs that day)`}
                          >
                            {lang === 'id' ? 'token' : 'tokens'}: {fmtK(tk.in)}→{fmtK(tk.out)} · {tk.calls} {lang === 'id' ? 'panggilan' : 'calls'}
                          </span>
                        )
                      })()}
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {report.category}
                      </span>
                      {report.decision && (
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${decisionColors[report.decision.toLowerCase()] || 'bg-slate-100 text-slate-600'}`}>
                          {report.decision}
                        </span>
                      )}
                      {reviewConfig[report.humanReview] && (
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${reviewConfig[report.humanReview].class}`}>
                          {lang === 'id' ? reviewConfig[report.humanReview].label_id : reviewConfig[report.humanReview].label}
                        </span>
                      )}
                    </div>
                    {report.summary && (
                      <p className="text-sm leading-6 text-slate-500 line-clamp-2">{report.summary}</p>
                    )}
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-slate-600 transition mt-1 flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>

          <p className="text-sm text-slate-400">
            {t['rep.count'](filtered.length, reports.length)}
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

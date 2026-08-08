import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Filter } from 'lucide-react'

interface Report {
  slug: string
  raw: string
  title: string
  date: string
  category: string
  decision: string
  summary: string
}

function extractSummary(md: string): string {
  // Pull the first paragraph from the question/findings section
  const q = md.match(/^##\s+(?:Engineering Question|Pertanyaan[^\n]*)\s*\n(.+?)(?:\n#|\n##|Z)/ms)
  if (q) return q[1].trim().replace(/\n/g, ' ')
  // Fallback: first non-frontmatter, non-heading paragraph
  const stripped = md.replace(/^---[\s\S]*?---\n?/m, '').replace(/^#+\s.+$/gm, '').trim()
  return stripped.split(/\n\n/)[0]?.replace(/\n/g, ' ') || ''
}

function parseReport(slug: string, raw: string): Report {
  const titleMatch = raw.match(/^# (.+)$/m)
  const dateMatch = raw.match(/\b(\d{4}-\d{2}-\d{2})\b/)
  const catMatch = raw.match(/Category:\s*(.+)/i)
  const decMatch = raw.match(/Decision:\s*(.+)/i)

  return {
    slug,
    raw,
    title: titleMatch?.[1]?.trim() || slug,
    date: dateMatch?.[1] || slug.slice(0, 10),
    category: catMatch?.[1]?.trim() || 'Engineering',
    decision: decMatch?.[1]?.trim() || '',
    summary: extractSummary(raw),
  }
}

const decisionColors: Record<string, string> = {
  adopt: 'bg-green-100 text-green-700',
  reject: 'bg-red-100 text-red-700',
  'needs experiment': 'bg-amber-100 text-amber-700',
  'needs human review': 'bg-blue-100 text-blue-700',
}

const categories = ['All', 'Engineering', 'Operations', 'Infrastructure', 'Architecture']

const PAGE_SIZE = 10

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [filter, setFilter] = useState('All')
  const [page, setPage] = useState(1)

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
  }, [])

  const filtered = filter === 'All' ? reports : reports.filter(r => r.category.toLowerCase().includes(filter.toLowerCase()))

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <div className="pb-20">
      <section className="relative overflow-hidden">
        <div className="layout-grid space-y-8 py-16 lg:py-24">
          <div className="max-w-3xl space-y-4">
            <span className="eyebrow">Engineering Reports</span>
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Daily engineering reports with measurable evidence.
            </h1>
            <p className="text-lg leading-8 text-slate-600">
              Every cycle produces a report: question, method, findings, decision, and metrics. No busywork — only real engineering work is documented here.
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
            <p className="text-slate-500">Loading reports...</p>
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
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {report.category}
                      </span>
                      {report.decision && (
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${decisionColors[report.decision.toLowerCase()] || 'bg-slate-100 text-slate-600'}`}>
                          {report.decision}
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
            {filtered.length} of {reports.length} reports from docs/reports/
          </p>

          {totalPages > 1 && (
            <nav className="flex items-center justify-between gap-4" aria-label="Pagination">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="rounded-lg border border-[var(--border-soft)] bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-[var(--border-strong)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>
              <span className="text-sm text-slate-500">
                Page {safePage} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="rounded-lg border border-[var(--border-soft)] bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-[var(--border-strong)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </nav>
          )}
        </div>
      </section>
    </div>
  )
}

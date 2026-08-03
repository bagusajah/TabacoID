import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, ArrowRight } from 'lucide-react'
import SectionHeading from '@/components/SectionHeading'

interface Report {
  slug: string
  raw: string
  title: string
  date: string
  category: string
  decision: string
  html: string
}

// ponytail: zero-dep markdown rendering — browser innerHTML with minimal sanitization.
// Upgrade to marked/rehype if XSS or complex rendering becomes a real concern.
function stripAndRender(md: string): string {
  return md
    // sanitize: strip html tags
    .replace(/<[^>]*>/g, '')
    // headings
    .replace(/^### (.+)$/gm, '<h4 class="text-base font-semibold text-slate-800 mt-5 mb-1">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="text-lg font-semibold text-slate-900 mt-6 mb-2">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="text-xl font-semibold text-slate-950 mt-6 mb-2">$1</h2>')
    // bold/italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // inline code
    .replace(/`([^`]+)`/g, '<code class="rounded bg-slate-100 px-1.5 py-0.5 text-sm font-mono text-slate-700">$1</code>')
    // code blocks
    .replace(/```[\s\S]*?```/g, (match) => {
      const code = match.replace(/```\w*\n?/, '').replace(/```$/, '')
      return `<pre class="rounded-lg bg-slate-900 p-4 text-sm text-slate-200 overflow-x-auto my-3"><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`
    })
    // tables
    .replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match.split('|').filter(c => c.trim())
      const tag = cells.every(c => /^[\s-:]+$/.test(c)) ? '' : 'tr'
      if (!tag) return ''
      return `<tr>${cells.map(c => `<td class="border-b border-slate-200 px-3 py-1.5 text-sm">${c.trim()}</td>`).join('')}</tr>`
    })
    // wrap tables
    .replace(/((?:<tr>.*<\/tr>\s*)+)/g, '<table class="w-full my-3">$1</table>')
    // unordered lists
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-sm leading-7 text-slate-600 list-disc">$1</li>')
    // ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 text-sm leading-7 text-slate-600 list-decimal">$1</li>')
    // paragraphs (lines not already wrapped)
    .replace(/^(?!<[hprtluo])((?!<).+)$/gm, '<p class="text-sm leading-7 text-slate-600 my-1">$1</p>')
    // horizontal rules
    .replace(/^---$/gm, '<hr class="my-6 border-slate-200" />')
}

function parseReport(slug: string, raw: string): Report {
  const titleMatch = raw.match(/^# (.+)$/m)
  const dateMatch = raw.match(/\*\*Date:\*\*\s*(.+)/)
  const catMatch = raw.match(/\*\*Category:\*\*\s*(.+)/)
  const decMatch = raw.match(/\*\*Decision:\*\*\s*(.+)/)

  const title = titleMatch?.[1] || slug
  const date = dateMatch?.[1] || slug.slice(0, 10)
  const category = catMatch?.[1] || 'Engineering'
  const decision = decMatch?.[1] || ''

  // Render full body, skip the header lines
  const body = raw
    .replace(/^# .+$/m, '')
    .replace(/\*\*Date:\*\*.+/, '')
    .replace(/\*\*Category:\*\*.+/, '')
    .replace(/\*\*Decision:\*\*.+/, '')
    .trim()

  return { slug, raw, title, date, category, decision, html: stripAndRender(body) }
}

const decisionColors: Record<string, string> = {
  adopt: 'bg-green-100 text-green-700',
  reject: 'bg-red-100 text-red-700',
  'needs experiment': 'bg-amber-100 text-amber-700',
  'needs human review': 'bg-blue-100 text-blue-700',
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    // Import all report markdown files via Vite's glob
    const modules = import.meta.glob('/docs/reports/*.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>

    Promise.all(
      Object.entries(modules).map(async ([path, loader]) => {
        const raw = await loader()
        const slug = path.split('/').pop()?.replace('.md', '') || path
        return parseReport(slug, raw)
      })
    ).then((parsed) => {
      // Sort newest first by date string
      parsed.sort((a, b) => b.date.localeCompare(a.date))
      setReports(parsed)
    })
  }, [])

  return (
    <div className="pb-20">
      <section className="relative overflow-hidden">
        <div className="layout-grid space-y-8 py-16 lg:py-24">
          <SectionHeading
            eyebrow="Engineering Reports"
            title="Daily engineering reports with measurable evidence."
            description="Every cycle produces a report: question, method, findings, decision, and metrics. No busywork — only real engineering work is documented here."
          />

          <div className="flex flex-wrap gap-3">
            <Link className="button-primary" to="/">
              Back to Home
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {reports.length === 0 && (
            <p className="text-slate-500">Loading reports...</p>
          )}

          <div className="space-y-4">
            {reports.map((report) => (
              <article key={report.slug} className="panel-surface overflow-hidden">
                <button
                  className="w-full text-left p-6 cursor-pointer hover:bg-slate-50/50 transition-colors"
                  onClick={() => setExpanded(expanded === report.slug ? null : report.slug)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <h3 className="text-lg font-semibold text-slate-950">{report.title}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" />
                          {report.date}
                        </span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          {report.category}
                        </span>
                        {report.decision && (
                          <span className={`rounded px-2 py-0.5 text-xs font-medium ${decisionColors[report.decision.toLowerCase()] || 'bg-slate-100 text-slate-600'}`}>
                            {report.decision}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 mt-1">
                      {expanded === report.slug ? '▲ collapse' : '▼ expand'}
                    </span>
                  </div>
                </button>

                {expanded === report.slug && (
                  <div className="border-t border-slate-100 px-6 py-6">
                    <div
                      className="prose-report"
                      dangerouslySetInnerHTML={{ __html: report.html }}
                    />
                  </div>
                )}
              </article>
            ))}
          </div>

          <p className="text-sm text-slate-400">
            {reports.length} reports from docs/reports/
          </p>
        </div>
      </section>
    </div>
  )
}

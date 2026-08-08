import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

import { useSEO } from '@/hooks/useSEO'

interface Report {
  slug: string
  title: string
  date: string
  category: string
  decision: string
  html: string
}

function stripAndRender(md: string): string {
  return md
    .replace(/<[^>]*>/g, '')
    .replace(/^---[\s\S]*?---\n?/m, '')
    .replace(/^### (.+)$/gm, '<h4 class="text-base font-semibold text-slate-800 mt-5 mb-1">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="text-lg font-semibold text-slate-900 mt-6 mb-2">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="text-xl font-semibold text-slate-950 mt-6 mb-2">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="rounded bg-slate-100 px-1.5 py-0.5 text-sm font-mono text-slate-700">$1</code>')
    .replace(/```[\s\S]*?```/g, (match) => {
      const code = match.replace(/```\w*\n?/, '').replace(/```$/, '')
      return `<pre class="rounded-lg bg-slate-900 p-4 text-sm text-slate-200 overflow-x-auto my-3"><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`
    })
    .replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match.split('|').filter(c => c.trim())
      const tag = cells.every(c => /^[\s-:]+$/.test(c)) ? '' : 'tr'
      if (!tag) return ''
      return `<tr>${cells.map(c => `<td class="border-b border-slate-200 px-3 py-1.5 text-sm">${c.trim()}</td>`).join('')}</tr>`
    })
    .replace(/((?:<tr>.*<\/tr>\s*)+)/g, '<table class="w-full my-3">$1</table>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-sm leading-7 text-slate-600 list-disc">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 text-sm leading-7 text-slate-600 list-decimal">$1</li>')
    .replace(/^(?!<[hprtluo])((?!<).+)$/gm, '<p class="text-sm leading-7 text-slate-600 my-1">$1</p>')
    .replace(/^---$/gm, '<hr class="my-6 border-slate-200" />')
}

function parseReport(slug: string, raw: string): Report {
  const titleMatch = raw.match(/^# (.+)$/m)
  const dateMatch = raw.match(/\b(\d{4}-\d{2}-\d{2})\b/)
  const catMatch = raw.match(/Category:\s*(.+)/i)
  const decMatch = raw.match(/Decision:\s*(.+)/i)

  return {
    slug,
    title: titleMatch?.[1]?.trim() || slug,
    date: dateMatch?.[1] || slug.slice(0, 10),
    category: catMatch?.[1]?.trim() || 'Engineering',
    decision: decMatch?.[1]?.trim() || '',
    html: stripAndRender(raw),
  }
}

const decisionColors: Record<string, string> = {
  adopt: 'bg-green-100 text-green-700',
  reject: 'bg-red-100 text-red-700',
  'needs experiment': 'bg-amber-100 text-amber-700',
  'needs human review': 'bg-blue-100 text-blue-700',
}

export default function ReportDetailPage() {
  const [report, setReport] = useState<Report | null>(null)
  const location = useLocation()
  const slug = location.pathname.split('/').pop()?.replace('.md', '') || ''

  useSEO(location.pathname, {
    title: report?.title ?? 'Engineering Report',
    description: report ? `${report.decision || report.category} — ${report.date}` : 'Engineering report from the TabacoID autonomous AI laboratory.',
  })

  useEffect(() => {
    const modules = import.meta.glob('/docs/reports/*.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>
    const key = Object.keys(modules).find(k => k.includes(slug))
    if (!key) return
    modules[key]().then(raw => setReport(parseReport(slug, raw)))
  }, [slug])

  if (!report) return <div className="layout-grid py-16"><p className="text-slate-500">Loading...</p></div>

  return (
    <div className="pb-20">
      <div className="layout-grid max-w-3xl py-16 lg:py-24 space-y-8">
        <Link to="/reports" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition">
          <ArrowLeft className="h-4 w-4" />
          All reports
        </Link>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span>{report.date}</span>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{report.category}</span>
            {report.decision && (
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${decisionColors[report.decision.toLowerCase()] || 'bg-slate-100 text-slate-600'}`}>
                {report.decision}
              </span>
            )}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{report.title}</h1>
        </div>

        <article className="prose-report">
          <div dangerouslySetInnerHTML={{ __html: report.html }} />
        </article>
      </div>
    </div>
  )
}

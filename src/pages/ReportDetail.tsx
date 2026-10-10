import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

import { useT, useLang } from '@/i18n'
import { useSEO } from '@/hooks/useSEO'
import { parseReport, decisionColors, reviewConfig, type Report } from '@/lib/reports'

// ponytail: literal patterns — import.meta.glob can't take variables (Vite build-time transform).
export default function ReportDetailPage({ source = 'reports' }: { source?: 'reports' | 'trending' }) {
  const [report, setReport] = useState<Report | null>(null)
  const location = useLocation()
  const slug = location.pathname.split('/').pop()?.replace('.md', '') || ''
  const t = useT()
  const { lang } = useLang()

  useSEO(location.pathname, {
    title: report?.title ?? 'Engineering Report',
    description: report ? `${report.decision || report.category} — ${report.date}` : 'Engineering report from the TabacoID autonomous AI laboratory.',
  })

  useEffect(() => {
    const modules = source === 'trending'
      ? (() => {
          const daily = import.meta.glob('/docs/trending/*.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>
          const monthly = import.meta.glob('/docs/trending/monthly/*.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>
          return { ...daily, ...monthly }
        })()
      : (import.meta.glob('/docs/reports/*.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>)
    const key = Object.keys(modules).find(k => k.includes(slug))
    if (!key) return
    modules[key]().then(raw => setReport(parseReport(slug, raw)))
  }, [slug, source])

  if (!report) return <div className="layout-grid py-16"><p className="text-slate-500">{t['rd.loading']}</p></div>

  return (
    <div className="pb-20">
      <div className="layout-grid max-w-3xl py-16 lg:py-24 space-y-8">
        <Link to={`/${source}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition">
          <ArrowLeft className="h-4 w-4" />
          {t['rd.back']}
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
            {reviewConfig[report.humanReview] && (
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${reviewConfig[report.humanReview].class}`}>
                {lang === 'id' ? reviewConfig[report.humanReview].label_id : reviewConfig[report.humanReview].label}
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

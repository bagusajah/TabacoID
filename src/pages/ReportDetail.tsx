import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

import { useT, useLang } from '@/i18n'
import { useSEO } from '@/hooks/useSEO'
import { parseReport, isPublished, decisionColors, reviewConfig, type Report } from '@/lib/reports'
import NotFoundPage from '@/pages/NotFound'

type LoadState = 'loading' | 'ready' | 'notFound' | 'error'

// ponytail: literal patterns — import.meta.glob can't take variables (Vite build-time transform).
export default function ReportDetailPage({ source = 'reports' }: { source?: 'reports' | 'trending' }) {
  const [report, setReport] = useState<Report | null>(null)
  const [state, setState] = useState<LoadState>('loading')
  const location = useLocation()
  const slug = (useParams().slug || '').replace(/\.md$/, '')
  const t = useT()
  const { lang } = useLang()

  useSEO(location.pathname, {
    title: report?.title ?? 'Engineering Report',
    description: report ? `${report.decision || report.category} — ${report.date}` : 'Engineering report from the TabacoID autonomous AI laboratory.',
  })

  useEffect(() => {
    let alive = true
    setReport(null)
    setState('loading')

    const modules = source === 'trending'
      ? (() => {
          const daily = import.meta.glob('/docs/trending/*.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>
          const monthly = import.meta.glob('/docs/trending/monthly/*.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>
          return { ...daily, ...monthly }
        })()
      : (import.meta.glob('/docs/reports/*.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>)
    const key = slug ? Object.keys(modules).find(k => k.endsWith('/' + slug + '.md')) : undefined
    if (!key) {
      setState('notFound')
      return
    }
    modules[key]()
      .then(raw => {
        if (!alive) return
        const parsed = parseReport(slug, raw)
        // Drafts are not public, even by direct URL.
        if (!isPublished(parsed)) {
          setState('notFound')
          return
        }
        setReport(parsed)
        setState('ready')
      })
      .catch(() => {
        if (alive) setState('error')
      })

    return () => {
      alive = false
    }
  }, [slug, source])

  if (state === 'notFound') return <NotFoundPage />

  if (state === 'error') {
    return (
      <div className="layout-grid py-16 space-y-4" role="alert">
        <p className="text-slate-600">
          {lang === 'id' ? 'Gagal memuat laporan. Periksa koneksi lalu coba lagi.' : 'Failed to load this report. Check your connection and try again.'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg border border-[var(--border-soft)] bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-[var(--border-strong)]"
        >
          {lang === 'id' ? 'Muat ulang' : 'Reload'}
        </button>
      </div>
    )
  }

  if (!report) return <div className="layout-grid py-16"><p className="text-slate-500">{t['rd.loading']}</p></div>

  return (
    <div className="pb-20">
      <div className="layout-grid max-w-3xl py-16 lg:py-24 space-y-8">
        <Link to={`/${source}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition">
          <ArrowLeft className="h-4 w-4" />
          {source === 'trending'
            ? (lang === 'id' ? 'Semua laporan trending' : 'All trending reports')
            : t['rd.back']}
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

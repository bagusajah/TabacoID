import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

import { useT } from '@/i18n'

function prepareDashboardHtml(raw: string): string {
  let html = raw.includes('<base ')
    ? raw
    : raw.replace(/<head[^>]*>/i, (open) => `${open}<base target="_blank">`)
  html = html.replace(/(\.sbar\s*\{[^}]*?)width:\s*340px/, '$1width:100%')
  html = html.replace(/(\.btrack\s*\{[^}]*?)flex:\s*0\s+0\s+200px/, '$1width:100%;flex:1 1 auto')
  html = html.replace(
    /<svg width="640" height="220"/g,
    '<svg width="100%" height="220" viewBox="0 0 640 220"',
  )
  html = html.replace(
    /<svg width="120" height="120"/g,
    '<svg width="100%" height="120" viewBox="0 0 120 120"',
  )
  // The outer page already has eyebrow+h1 — hide the document's own header
  // to avoid the double-title/double-hero effect inside the iframe.
  html = html.replace(
    /<\/head>/i,
    '<style>.layout > p.eyebrow:first-of-type, .layout > h1:first-of-type { display: none; }</style></head>',
  )
  return html
}

/**
 * Dashboard GitHub Trending — merender dashboard.html
 * di dalam iframe fullscreen. Dashboard di-bundle dari docs/dashboard/
 * saat build; file tersebut dibangun otomatis oleh pipeline github-reporter.
 */
export default function TrendingDashboard() {
  const [html, setHtml] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const t = useT()

  useEffect(() => {
    fetch('/docs/dashboard/dashboard.html')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.text()
      })
      .then(raw => setHtml(prepareDashboardHtml(raw)))
      .catch(e => { console.error(e); setErr(String(e)) })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="pb-20">
      <section className="relative overflow-hidden">
        <div className="layout-grid space-y-4 py-16 lg:py-24">
          <Link
            to="/trending"
            className="inline-flex min-h-11 items-center gap-2 text-sm text-indigo-600 hover:underline"
          >
            <ArrowRight className="h-4 w-4 rotate-180" aria-hidden="true" />
            {t['td.back']}
          </Link>
          <div className="max-w-3xl space-y-4">
            <span className="eyebrow">{t['td.eyebrow']}</span>
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              {t['td.title']}
            </h1>
            <p className="text-lg leading-8 text-slate-600">
              {t['td.desc']}
            </p>
          </div>
        </div>
      </section>

      <div className="layout-grid pb-20">
        {loading && <p className="panel-soft text-slate-600" role="status">{t['td.loading']}</p>}
        {err && (
          <div className="panel-soft flex flex-wrap items-center gap-4" role="alert">
            <p className="flex-1 text-slate-600">{t['td.error']}</p>
            <button
              onClick={() => window.location.reload()}
              className="button-secondary"
            >
              {t['td.retry']}
            </button>
          </div>
        )}
        {!loading && !err && (
          <iframe
            title={t['td.iframe']}
            srcDoc={html}
            className="h-[85vh] w-full rounded-xl border border-slate-200 bg-white shadow-sm"
            sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          />
        )}
      </div>
    </div>
  )
}

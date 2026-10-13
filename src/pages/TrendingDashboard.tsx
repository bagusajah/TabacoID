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
      .catch(e => setErr(String(e)))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="pb-20">
      <section className="relative overflow-hidden">
        <div className="layout-grid space-y-6 py-12 lg:py-16">
          <span className="eyebrow">{t['td.eyebrow']}</span>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            {t['td.title']}
          </h1>
          <p className="max-w-2xl text-slate-600">
            {t['td.desc']}
          </p>
        </div>
      </section>

      <div className="layout-grid pb-16">
        {loading && <p className="text-slate-500">{t['td.loading']}</p>}
        {err && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {t['td.error'](err)}
          </p>
        )}
        {!loading && !err && (
          <iframe
            title={t['td.iframe']}
            srcDoc={html}
            className="h-[85vh] w-full rounded-xl border border-slate-200 bg-white shadow-sm"
            sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          />
        )}
        <Link
          to="/trending"
          className="mt-6 inline-flex items-center gap-2 text-sm text-indigo-600 hover:underline"
        >
          <ArrowRight className="h-4 w-4 rotate-180" />
          {t['td.back']}
        </Link>
      </div>
    </div>
  )
}

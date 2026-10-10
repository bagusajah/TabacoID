import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'

import { useSEO } from '@/hooks/useSEO'

/**
 * Dashboard GitHub Trending — merender dashboard.html (282 hari arsip)
 * di dalam iframe fullscreen. Dashboard di-bundle dari docs/dashboard/
 * saat build; file tersebut dibangun otomatis oleh pipeline github-reporter.
 */
export default function TrendingDashboard() {
  const [html, setHtml] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useSEO('/trending/dashboard', {
    title: 'Dashboard Trending',
    description: 'Visualisasi 282 hari GitHub Trending 2026: bahasa, era, konsistensi, organisasi',
  })

  useEffect(() => {
    fetch('/docs/dashboard/dashboard.html')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.text()
      })
      .then(setHtml)
      .catch(e => setErr(String(e)))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="pb-20">
      <section className="relative overflow-hidden">
        <div className="layout-grid space-y-6 py-12 lg:py-16">
          <span className="eyebrow">Dashboard</span>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            GitHub Trending 2026 — Visual
          </h1>
          <p className="max-w-2xl text-slate-600">
            Komposisi bahasa, siklus hidup repo, era shift, konsistensi, dan kekuatan
            organisasi — dibangun otomatis dari arsip 282 hari kolektor harian.
          </p>
        </div>
      </section>

      <div className="layout-grid pb-16">
        {loading && <p className="text-slate-500">Memuat dashboard…</p>}
        {err && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            Gagal memuat dashboard: {err}
          </p>
        )}
        {!loading && !err && (
          <iframe
            title="Dashboard GitHub Trending 2026"
            srcDoc={html}
            className="h-[85vh] w-full rounded-xl border border-slate-200 bg-white shadow-sm"
            sandbox="allow-same-origin allow-popups"
          />
        )}
        <a
          href="/trending"
          className="mt-6 inline-flex items-center gap-2 text-sm text-indigo-600 hover:underline"
        >
          <ArrowRight className="h-4 w-4 rotate-180" />
          Kembali ke laporan trending
        </a>
      </div>
    </div>
  )
}

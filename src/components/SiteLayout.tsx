import { Menu, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'

import LanguageToggle from '@/components/LanguageToggle'
import { brandName, contactEmail, githubUrl, navItems } from '@/data/site'
import { useT } from '@/i18n'
import { useSEO } from '@/hooks/useSEO'

export default function SiteLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const t = useT()

  const seoData = useMemo(() => {
    if (location.pathname === '/') return { title: 'TabacoID', description: t['seo.home.desc'] }
    if (location.pathname.startsWith('/reports/') && location.pathname !== '/reports') {
      return { title: 'Engineering Report', description: t['seo.reports.desc'] }
    }
    if (location.pathname === '/reports') return { title: t['rep.eyebrow'], description: t['seo.reports.desc'] }
    if (location.pathname === '/about') return { title: t['about.eyebrow'], description: t['seo.about.desc'] }
    return { title: 'Page Not Found', description: t['seo.about.desc'] }
  }, [location.pathname, t])

  useSEO(location.pathname, seoData)

  const activePath = useMemo(() => {
    if (location.pathname === '/') return '/'
    return `/${location.pathname.split('/')[1]}`
  }, [location.pathname])

  const closeMobileMenu = () => setMobileOpen(false)

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-slate-900">
      <header className="sticky top-0 z-50 border-b border-[var(--border-soft)] bg-[rgba(250,250,252,0.88)] backdrop-blur-xl">
        <div className="layout-grid flex items-center justify-between gap-4 py-4">
          <Link aria-label={brandName} className="flex items-center" to="/">
            <img alt={brandName} className="h-9 w-auto sm:h-10" src="/tabacoid-logo.svg" />
          </Link>

          <nav className="hidden items-center gap-2 rounded-full border border-[var(--border-soft)] bg-white/90 p-1 shadow-[var(--shadow-soft)] md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                className={({ isActive }) =>
                  ['nav-pill', isActive ? 'nav-pill-active' : '']
                    .filter(Boolean)
                    .join(' ')
                }
                to={item.path}
              >
                {t[`nav.${item.label.toLowerCase()}`]}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageToggle />
            <a
              className="hidden rounded-full border border-[var(--border-soft)] bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-[var(--border-strong)] md:inline-flex"
              href={githubUrl}
            >
              GitHub
            </a>
            <button
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-soft)] bg-white shadow-[var(--shadow-soft)] md:hidden"
              onClick={() => setMobileOpen((value) => !value)}
              type="button"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <div className="border-t border-[var(--border-soft)] bg-white/95 md:hidden">
            <div className="layout-grid grid gap-2 py-4">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  className={[
                    'rounded-2xl border px-4 py-3 text-sm font-medium transition',
                    activePath === item.path
                      ? 'border-[var(--border-strong)] bg-slate-950 text-white'
                      : 'border-[var(--border-soft)] bg-[var(--surface)] text-slate-700 hover:border-[var(--border-strong)] hover:bg-white',
                  ].join(' ')}
                  onClick={closeMobileMenu}
                  to={item.path}
                >
                  {t[`nav.${item.label.toLowerCase()}`]}
                </NavLink>
              ))}
              <a
                className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm font-medium text-slate-700"
                href={githubUrl}
              >
                GitHub Repository
              </a>
            </div>
          </div>
        ) : null}
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="border-t border-[var(--border-soft)] bg-white/88">
        <div className="layout-grid grid gap-10 py-12 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div className="space-y-5">
            <img alt={brandName} className="h-10 w-auto sm:h-12" src="/tabacoid-logo.svg" />
            <h2 className="max-w-md text-2xl font-semibold tracking-tight text-slate-950">
              {t['footer.tagline']}
            </h2>
            <p className="max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
              {t['footer.desc']}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link className="button-primary" to="/reports">
                {t['footer.readReports']}
              </Link>
              <a className="button-secondary" href={`mailto:${contactEmail}`}>
                {contactEmail}
              </a>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              {t['footer.pages']}
            </p>
            <div className="grid gap-2 text-sm text-slate-600">
              {navItems.map((item) => (
                <Link className="transition hover:text-slate-950" key={item.path} to={item.path}>
                  {t[`nav.${item.label.toLowerCase()}`]}
                </Link>
              ))}
              <a className="transition hover:text-slate-950" href={githubUrl}>
                GitHub
              </a>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              {t['footer.contact']}
            </p>
            <a className="inline-flex text-sm text-slate-600 transition hover:text-slate-950" href={`mailto:${contactEmail}`}>
              {contactEmail}
            </a>
            <p className="text-sm leading-7 text-slate-600">
              {t['footer.contactDesc']}
            </p>
          </div>
        </div>

        <div className="layout-grid border-t border-[var(--border-soft)] py-5 text-sm text-slate-500">
          <p>{t['footer.copyright'](new Date().getFullYear(), brandName)}</p>
        </div>
      </footer>
    </div>
  )
}

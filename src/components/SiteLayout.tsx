import { Menu, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'

import { brandName, contactEmail, navItems } from '@/data/site'

export default function SiteLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  const activePath = useMemo(() => {
    if (location.pathname === '/') {
      return '/'
    }

    return `/${location.pathname.split('/')[1]}`
  }, [location.pathname])

  const closeMobileMenu = () => setMobileOpen(false)

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-slate-900">
      <header className="sticky top-0 z-50 border-b border-[var(--border-soft)] bg-[rgba(250,250,252,0.88)] backdrop-blur-xl">
        <div className="layout-grid flex items-center justify-between gap-4 py-4">
          <Link className="flex items-center gap-3 text-sm font-semibold tracking-[0.2em] text-slate-950" to="/">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-[var(--border-soft)] bg-white shadow-[var(--shadow-soft)]">
              TW
            </span>
            <span>{brandName}</span>
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
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <a
              className="hidden text-sm font-medium text-slate-600 transition hover:text-slate-950 lg:inline-flex"
              href={`mailto:${contactEmail}`}
            >
              {contactEmail}
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
                  {item.label}
                </NavLink>
              ))}
              <Link
                className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm font-medium text-slate-700"
                onClick={closeMobileMenu}
                to="/contact"
              >
                {contactEmail}
              </Link>
            </div>
          </div>
        ) : null}
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="border-t border-[var(--border-soft)] bg-white/88">
        <div className="layout-grid grid gap-10 py-12 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div className="space-y-4">
            <span className="eyebrow">TabacoID</span>
            <h2 className="max-w-md text-2xl font-semibold tracking-tight text-slate-950">
              A digital product studio for teams that need sharper interfaces and cleaner launches.
            </h2>
            <p className="max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
              We help product and service businesses move from scattered surfaces to coherent,
              production-ready digital experiences.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Navigation
            </p>
            <div className="grid gap-2 text-sm text-slate-600">
              {navItems.map((item) => (
                <Link className="transition hover:text-slate-950" key={item.path} to={item.path}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Contact
            </p>
            <a
              className="inline-flex text-sm text-slate-600 transition hover:text-slate-950"
              href={`mailto:${contactEmail}`}
            >
              {contactEmail}
            </a>
            <p className="text-sm leading-7 text-slate-600">
              Available for focused redesigns, launch sprints, and ongoing product studio support.
            </p>
          </div>
        </div>

        <div className="layout-grid border-t border-[var(--border-soft)] py-5 text-sm text-slate-500">
          <p>© {new Date().getFullYear()} {brandName}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

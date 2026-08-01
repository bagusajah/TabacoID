import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

type HeroLink = {
  label: string
  to: string
  variant?: 'primary' | 'secondary'
}

type PageHeroProps = {
  eyebrow: string
  title: string
  description: string
  links?: HeroLink[]
  aside?: {
    title: string
    items: string[]
  }
}

export default function PageHero({
  eyebrow,
  title,
  description,
  links = [],
  aside,
}: PageHeroProps) {
  return (
    <section className="relative overflow-hidden pt-10">
      <div className="absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_top,rgba(75,63,227,0.14),transparent_62%)]" />

      <div className="layout-grid gap-8 py-14 lg:grid-cols-[minmax(0,1fr)_320px] lg:py-20">
        <div className="space-y-6">
          <span className="eyebrow">{eyebrow}</span>
          <h1 className="max-w-4xl text-balance text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-slate-600">{description}</p>

          {links.length ? (
            <div className="flex flex-wrap gap-3 pt-2">
              {links.map((link) => (
                <Link
                  key={`${link.to}-${link.label}`}
                  className={link.variant === 'secondary' ? 'button-secondary' : 'button-primary'}
                  to={link.to}
                >
                  {link.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        {aside ? (
          <aside className="panel-surface h-fit space-y-5">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
              {aside.title}
            </p>
            <ul className="space-y-3">
              {aside.items.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-sm leading-6 text-slate-600 sm:text-base"
                >
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--brand)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </aside>
        ) : null}
      </div>
    </section>
  )
}

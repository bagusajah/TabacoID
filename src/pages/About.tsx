import { Link } from 'react-router-dom'

import SectionHeading from '@/components/SectionHeading'
import {
  githubUrl,
  labPrinciples,
  objectives,
  systems,
} from '@/data/site'
import { useT } from '@/i18n'

export default function AboutPage() {
  const t = useT()

  return (
    <div className="pb-20">
      <section className="relative overflow-hidden pt-10">
        <div className="absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_top,rgba(75,63,227,0.14),transparent_62%)]" />

        <div className="layout-grid gap-8 py-14 lg:py-20">
          <div className="space-y-6">
            <span className="eyebrow">{t['about.eyebrow']}</span>
            <h1 className="max-w-4xl text-balance text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              {t['about.title']}
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-600">
              {t['about.subtitle']}
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <a
                className="button-primary"
                href="https://github.com/bagusajah/TabacoID/blob/main/docs/VISION.md"
              >
                {t['about.cta.vision']}
              </a>
              <Link className="button-secondary" to="/reports">
                {t['about.cta.reports']}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Thesis */}
      <section className="layout-grid py-8 sm:py-12">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
          <article className="panel-surface">
            <SectionHeading
              eyebrow={t['thesis.eyebrow']}
              title={t['thesis.title']}
              description={t['thesis.desc']}
            />
          </article>

          <article className="panel-soft space-y-4">
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-slate-500">
              {t['thesis.metric.label']}
            </p>
            <p className="text-lg leading-8 text-slate-700">
              {t['thesis.metric.value']}
            </p>
          </article>
        </div>
      </section>

      {/* Systems */}
      <section className="layout-grid space-y-8 py-12 lg:py-16">
        <SectionHeading
          eyebrow={t['sys.eyebrow']}
          title={t['sys.title']}
          description={t['sys.desc']}
        />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {systems.map((sys) => (
            <article className="panel-soft space-y-2" key={sys.name}>
              <h3 className="text-lg font-semibold text-slate-950">{sys.name}</h3>
              <p className="text-sm font-mono text-[var(--brand)]">{sys.stack}</p>
              <p className="text-sm leading-6 text-slate-600">{sys.role}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Objectives */}
      <section className="section-band section-band-muted">
        <div className="layout-grid space-y-8 py-12 lg:py-16">
          <SectionHeading
            eyebrow={t['obj.eyebrow']}
            title={t['obj.title']}
            description={t['obj.desc']}
          />

          <div className="grid gap-4">
            {objectives.map((obj) => (
              <article className="panel-surface flex items-center gap-6" key={obj.id}>
                <span className="shrink-0 rounded-lg bg-slate-950 px-3 py-2 text-sm font-mono font-bold text-white">
                  {obj.id}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">{obj.title}</h3>
                  <p className="text-sm text-slate-500">{t['obj.metric']}: {obj.success_metric}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="layout-grid space-y-8 py-12 lg:py-16">
        <SectionHeading
          eyebrow={t['prin.eyebrow']}
          title={t['prin.title']}
          description={t['prin.desc']}
        />

        <div className="grid gap-5 md:grid-cols-3">
          {labPrinciples.map((principle) => (
            <article className="panel-surface space-y-5" key={principle.title}>
              <div className="icon-frame">
                <principle.icon className="h-5 w-5" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-semibold tracking-tight text-slate-950">{principle.title}</h3>
                <p className="text-sm leading-7 text-slate-600 sm:text-base">{principle.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Source */}
      <section className="layout-grid py-12">
        <div className="panel-surface panel-accent flex flex-col items-start gap-4">
          <span className="eyebrow">{t['src.eyebrow']}</span>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            {t['src.title']}
          </h2>
          <a className="button-primary" href={githubUrl}>
            {t['src.cta']}
          </a>
        </div>
      </section>
    </div>
  )
}

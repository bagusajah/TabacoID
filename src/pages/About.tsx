import { Link } from 'react-router-dom'

import SectionHeading from '@/components/SectionHeading'
import {
  brandName,
  githubUrl,
  labPrinciples,
  objectives,
  systems,
} from '@/data/site'

export default function AboutPage() {
  return (
    <div className="pb-20">
      <section className="relative overflow-hidden pt-10">
        <div className="absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_top,rgba(75,63,227,0.14),transparent_62%)]" />

        <div className="layout-grid gap-8 py-14 lg:py-20">
          <div className="space-y-6">
            <span className="eyebrow">About</span>
            <h1 className="max-w-4xl text-balance text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Not a portfolio. An engineering laboratory documenting autonomous AI in production.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-600">
              {brandName} is a living engineering laboratory documenting Hermes, an autonomous AI platform engineering agent. The website is the transparent interface into its activities.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <a
                className="button-primary"
                href="https://github.com/bagusajah/TabacoID/blob/main/docs/VISION.md"
              >
                Read the vision doc
              </a>
              <Link className="button-secondary" to="/reports">
                Read the reports
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
              eyebrow="The thesis"
              title="The website is not the product. Hermes is the product."
              description="This site exists to demonstrate the real-world impact of an autonomous AI agent operating over months in a production-like engineering environment. Instead of asking 'can AI write code?', the project asks 'can it continuously operate as a platform engineer while producing measurable value?'"
            />
          </article>

          <article className="panel-soft space-y-4">
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-slate-500">
              Success metric
            </p>
            <p className="text-lg leading-8 text-slate-700">
              Measurable engineering outcomes — not commits, file counts, or the appearance of productivity.
            </p>
          </article>
        </div>
      </section>

      {/* Systems */}
      <section className="layout-grid space-y-8 py-12 lg:py-16">
        <SectionHeading
          eyebrow="Systems"
          title="Seven systems under Hermes engineering."
          description="Hermes operates across the full stack — from hardware to application. Each system is maintained, monitored, and improved through the engineering cycle."
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
            eyebrow="Objectives"
            title="Five mission-level objectives tracked on the Kanban board."
            description="Every task links to one of these objectives. Progress is measured by completed engineering outcomes, not activity."
          />

          <div className="grid gap-4">
            {objectives.map((obj) => (
              <article className="panel-surface flex items-center gap-6" key={obj.id}>
                <span className="shrink-0 rounded-lg bg-slate-950 px-3 py-2 text-sm font-mono font-bold text-white">
                  {obj.id}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">{obj.title}</h3>
                  <p className="text-sm text-slate-500">Metric: {obj.success_metric}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="layout-grid space-y-8 py-12 lg:py-16">
        <SectionHeading
          eyebrow="Principles"
          title="The philosophy is intentionally restrained."
          description="Prefer simplicity, reliability, automation, documentation. Avoid feature bloat, premature optimization, unnecessary frameworks, and AI-generated busywork."
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
          <span className="eyebrow">Open source</span>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            Every report, every experiment, every failure — public on GitHub.
          </h2>
          <a className="button-primary" href={githubUrl}>
            View the repository
          </a>
        </div>
      </section>
    </div>
  )
}

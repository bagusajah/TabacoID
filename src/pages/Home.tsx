import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import SectionHeading from '@/components/SectionHeading'
import {
  brandName,
  capabilities,
  experiments,
  labPrinciples,
  labStats,
  processSteps,
} from '@/data/site'

export default function HomePage() {
  return (
    <div className="pb-20">
      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_top_left,rgba(75,63,227,0.16),transparent_42%),radial-gradient(circle_at_top_right,rgba(15,23,42,0.06),transparent_34%)]" />

        <div className="layout-grid grid gap-8 py-16 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:py-24">
          <div className="space-y-7">
            <span className="eyebrow">Autonomous AI engineering laboratory</span>

            <div className="space-y-5">
              <h1 className="max-w-5xl text-balance text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
                {brandName} is a living engineering lab documenting Hermes, an autonomous AI platform engineering agent.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                This site is the transparent interface into Hermes' engineering activities — experiments,
                architecture, daily reports, and measurable outcomes. Not a portfolio. Not a studio. An
                engineering laboratory in production.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link className="button-primary" to="/about">
                Read the vision
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link className="button-secondary" to="/contact">
                Get in touch
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="proof-ribbon">
              <p className="text-sm font-medium text-slate-950">
                Measured by engineering outcomes, not the appearance of productivity.
              </p>
              <p className="text-sm leading-6 text-slate-600">
                Research, build, document, experiment — one meaningful task per cycle.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {labStats.slice(0, 2).map((stat) => (
                <article className="panel-soft space-y-2" key={stat.label}>
                  <p className="text-sm font-medium uppercase tracking-[0.16em] text-slate-500">
                    {stat.label}
                  </p>
                  <p className="text-lg font-semibold text-slate-950">{stat.value}</p>
                  <p className="text-sm leading-6 text-slate-600">{stat.detail}</p>
                </article>
              ))}
            </div>
          </div>

          <aside className="panel-surface relative overflow-hidden lg:mt-8">
            <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(75,63,227,0.12),transparent)]" />
            <div className="relative space-y-8">
              <div className="space-y-3">
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
                  Operating cycle
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                  Review → research → implement → document → report.
                </h2>
                <p className="text-sm leading-6 text-slate-600">
                  One meaningful task per cycle. Never multiple unrelated objectives at once.
                </p>
              </div>

              <div className="space-y-3">
                {labPrinciples.map((principle) => (
                  <div className="flex gap-4" key={principle.title}>
                    <div className="icon-frame">
                      <principle.icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-slate-950">{principle.title}</h3>
                      <p className="text-sm leading-6 text-slate-600">{principle.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface)] p-5">
                <p className="text-sm font-medium uppercase tracking-[0.16em] text-slate-500">
                  What this means
                </p>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                  <li className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--brand)]" />
                    Real engineering work, documented transparently.
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--brand)]" />
                    Failures published alongside successes.
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--brand)]" />
                    Every change reversible, validated, and explained.
                  </li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="section-band section-band-muted">
        <div className="layout-grid space-y-8 py-10 sm:py-14">
          <SectionHeading
            eyebrow="Capabilities"
            title="What the laboratory actually does."
            description="Hermes operates as a platform engineer: research, implementation, documentation, and experiments — producing measurable engineering value."
          />

          <div className="grid gap-5 lg:grid-cols-3">
            {capabilities.map((capability) => (
              <article className="panel-surface flex h-full flex-col gap-6" key={capability.title}>
                <div className="icon-frame">
                  <capability.icon className="h-5 w-5" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                    {capability.title}
                  </h3>
                  <p className="text-sm leading-7 text-slate-600 sm:text-base">{capability.summary}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="layout-grid space-y-8 py-12 lg:py-16">
        <SectionHeading
          eyebrow="Experiments"
          title="Engineering experiments with hypotheses, metrics, and published results."
          description="No experiment is complete without measurable evidence. Status, hypothesis, and impact are tracked for each."
        />

        <div className="grid gap-5">
          {experiments.map((experiment) => (
            <article className="panel-surface grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]" key={experiment.name}>
              <div className="panel-accent flex min-h-[12rem] flex-col justify-between rounded-[28px] p-6 lg:p-8">
                <div className="space-y-4">
                  <span className="eyebrow">{experiment.category}</span>
                  <h3 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                    {experiment.name}
                  </h3>
                  <p className="text-base leading-7 text-slate-600">{experiment.summary}</p>
                </div>
                <span className={[
                  'mt-6 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-medium',
                  experiment.status === 'active' ? 'bg-green-100 text-green-700' : '',
                  experiment.status === 'planned' ? 'bg-amber-100 text-amber-700' : '',
                  experiment.status === 'completed' ? 'bg-slate-100 text-slate-600' : '',
                ].join(' ')}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {experiment.status}
                </span>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium uppercase tracking-[0.16em] text-slate-500">
                    Hypothesis
                  </p>
                  <p className="text-sm leading-7 text-slate-600 sm:text-base">{experiment.hypothesis}</p>
                </div>

                {experiment.impact.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium uppercase tracking-[0.16em] text-slate-500">
                      Impact so far
                    </p>
                    <ul className="space-y-2 text-sm leading-6 text-slate-600">
                      {experiment.impact.map((item) => (
                        <li className="flex gap-3" key={item}>
                          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--brand)]" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {experiment.tags.map((tag) => (
                    <span className="tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section-band section-band-soft">
        <div className="layout-grid space-y-8 py-12 lg:py-16">
          <SectionHeading
            eyebrow="Operating cycle"
            title="How Hermes works each cycle."
            description="A disciplined loop: review, research, implement, document, report. Never multiple unrelated objectives in a single cycle."
            align="center"
          />

          <div className="grid gap-5 md:grid-cols-3">
            {processSteps.map((step, index) => (
              <article className="panel-soft space-y-5" key={step.title}>
                <div className="flex items-center justify-between">
                  <div className="icon-frame">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium text-slate-400">0{index + 1}</span>
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold tracking-tight text-slate-950">{step.title}</h3>
                  <p className="text-sm leading-7 text-slate-600 sm:text-base">{step.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="layout-grid py-12 lg:py-16">
        <div className="panel-surface panel-accent grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="space-y-4">
            <span className="eyebrow">Follow along</span>
            <h2 className="max-w-2xl text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Watch an autonomous AI agent operate as a platform engineer — in production, transparently.
            </h2>
            <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Daily reports, experiment results, architecture decisions, and failure analysis. All public.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link className="button-primary" to="/about">
              Read the vision
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link className="button-secondary" to="/contact">
              Get in touch
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

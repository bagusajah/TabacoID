import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import SectionHeading from '@/components/SectionHeading'
import {
  brandName,
  featuredProjects,
  processSteps,
  services,
  studioPrinciples,
  studioStats,
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
              {studioStats.slice(0, 2).map((stat) => (
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
                  Studio focus
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                  Strategy, interface design, and frontend delivery in one streamlined flow.
                </h2>
                <p className="text-sm leading-6 text-slate-600">
                  Built for teams that need a more mature digital presence without bloated process.
                </p>
              </div>

              <div className="space-y-3">
                {studioPrinciples.map((principle) => (
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
                  What this looks like
                </p>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                  <li className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-[var(--brand)]" />
                    Structured pages that tell a stronger product story.
                  </li>
                  <li className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-[var(--brand)]" />
                    Cleaner UI patterns that feel ready for real customers.
                  </li>
                  <li className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-[var(--brand)]" />
                    Shared sections and code that are easy to extend over time.
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
            title="A practical studio stack for product teams that need more than a brochure site."
            description="We combine product thinking, visual refinement, and frontend implementation so the final output feels cohesive instead of stitched together."
          />

          <div className="grid gap-5 lg:grid-cols-3">
            {services.slice(0, 3).map((service) => (
              <article className="panel-surface flex h-full flex-col gap-6" key={service.title}>
                <div className="icon-frame">
                  <service.icon className="h-5 w-5" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                    {service.title}
                  </h3>
                  <p className="text-sm leading-7 text-slate-600 sm:text-base">{service.summary}</p>
                </div>
                <ul className="space-y-2 text-sm leading-6 text-slate-600">
                  {service.bullets.map((bullet) => (
                    <li className="flex gap-3" key={bullet}>
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--brand)]" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="layout-grid space-y-8 py-12 lg:py-16">
        <SectionHeading
          eyebrow="Selected work"
          title="Recent engagement patterns focused on trust, clarity, and launch quality."
          description="Each project is different, but the throughline stays the same: better hierarchy, better structure, and stronger conversion intent."
        />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
          {featuredProjects.map((project, index) => (
            <article
              className={[
                'panel-surface overflow-hidden',
                index === 0 ? 'xl:row-span-2' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              key={project.name}
            >
              <div className={['mb-6 rounded-[24px] p-6', index === 0 ? 'panel-accent case-study-hero' : 'bg-[var(--surface-muted)]'].join(' ')}>
                <p className="text-sm font-medium uppercase tracking-[0.16em] text-[var(--brand)]">
                  {project.category}
                </p>
                <h3 className={['mt-3 font-semibold tracking-tight text-slate-950', index === 0 ? 'text-3xl sm:text-4xl' : 'text-2xl'].join(' ')}>
                  {project.name}
                </h3>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">{project.summary}</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium uppercase tracking-[0.16em] text-slate-500">
                    Challenge
                  </p>
                  <p className="text-sm leading-7 text-slate-600 sm:text-base">{project.challenge}</p>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium uppercase tracking-[0.16em] text-slate-500">
                    Impact
                  </p>
                  <ul className="space-y-2 text-sm leading-6 text-slate-600">
                    {project.impact.map((item) => (
                      <li className="flex gap-3" key={item}>
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-[var(--brand)]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
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
            eyebrow="How we work"
            title="A straightforward process that keeps momentum high and handoffs low."
            description="The studio model stays intentionally lean so insight, design, and implementation remain tightly connected."
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
            <span className="eyebrow">Next step</span>
            <h2 className="max-w-2xl text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              If your current site feels dated, unclear, or too portfolio-shaped, TabacoID can help reframe it.
            </h2>
            <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              We design and implement premium, enterprise-light surfaces that feel current, credible,
              and ready to support growth.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link className="button-primary" to="/contact">
              Talk about your project
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link className="button-secondary" to="/work">
              Explore selected work
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

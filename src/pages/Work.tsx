import { ArrowUpRight, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import PageHero from '@/components/PageHero'
import SectionHeading from '@/components/SectionHeading'
import { featuredProjects } from '@/data/site'

const studioOutcomes = [
  'Narratives that explain complex offers with less friction',
  'Consistent section systems for future page creation',
  'A cleaner premium aesthetic that feels credible in enterprise contexts',
]

export default function WorkPage() {
  return (
    <div className="pb-20">
      <PageHero
        aside={{
          title: 'What clients usually need',
          items: [
            'A more mature digital presence for a growing company',
            'Clearer communication for technical or service-heavy offers',
            'Reusable structure instead of a one-page portfolio pattern',
          ],
        }}
        description="These sample engagements reflect the kind of problems TabacoID solves: unclear positioning, fragmented interfaces, and websites that do not yet match the quality of the product behind them."
        eyebrow="Work"
        links={[
          { label: 'Explore services', to: '/services' },
          { label: 'Start a project', to: '/contact', variant: 'secondary' },
        ]}
        title="Selected work patterns that show how strategy, design, and code come together."
      />

      <section className="layout-grid space-y-8 py-8 sm:py-12">
        <SectionHeading
          eyebrow="Case studies"
          title="Representative work shaped around higher trust, better hierarchy, and launch readiness."
          description="Instead of generic gallery cards, each engagement is framed around the business problem, the structure we introduced, and the practical impact on the final experience."
        />

        <div className="grid gap-5">
          {featuredProjects.map((project, index) => (
            <article
              className="panel-surface grid gap-8 overflow-hidden lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"
              key={project.name}
            >
              <div className="panel-accent flex min-h-[18rem] flex-col justify-between rounded-[28px] p-6 lg:p-8">
                <div className="space-y-4">
                  <span className="eyebrow">{project.category}</span>
                  <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                    {project.name}
                  </h2>
                  <p className="text-base leading-7 text-slate-600">{project.summary}</p>
                </div>

                <div className="mt-10 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[22px] border border-white/70 bg-white/80 p-4">
                    <p className="text-sm font-medium uppercase tracking-[0.16em] text-slate-500">
                      Focus
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">Trust-building redesign</p>
                  </div>
                  <div className="rounded-[22px] border border-white/70 bg-white/80 p-4">
                    <p className="text-sm font-medium uppercase tracking-[0.16em] text-slate-500">
                      Delivery
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">Structured responsive system</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 lg:content-start">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-medium uppercase tracking-[0.16em] text-slate-500">
                    Case study {index + 1}
                  </p>
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] text-slate-500">
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </div>

                <div className="space-y-3">
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

      <section className="layout-grid py-12 lg:py-16">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="panel-surface space-y-6">
            <SectionHeading
              eyebrow="Common outcomes"
              title="The goal is not visual novelty. It is a stronger digital surface that performs like a real business asset."
              description="TabacoID focuses on practical quality: stronger hierarchy, coherent storytelling, responsive structure, and frontend implementation that is straightforward to maintain."
            />

            <div className="grid gap-3 sm:grid-cols-3">
              {studioOutcomes.map((outcome) => (
                <div className="rounded-[22px] border border-[var(--border-soft)] bg-[var(--surface)] p-4" key={outcome}>
                  <p className="text-sm leading-7 text-slate-600">{outcome}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="panel-soft flex flex-col justify-between gap-8">
            <div className="space-y-3">
              <p className="text-sm font-medium uppercase tracking-[0.16em] text-slate-500">
                Need something similar?
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                We can help turn an outdated portfolio-style site into a fuller studio presence.
              </h2>
              <p className="text-sm leading-7 text-slate-600 sm:text-base">
                That may include new routing, stronger content structure, reusable sections, and a more
                mature design system foundation.
              </p>
            </div>

            <Link className="button-primary w-fit" to="/contact">
              Talk to TabacoID
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </aside>
        </div>
      </section>
    </div>
  )
}

import { CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import PageHero from '@/components/PageHero'
import SectionHeading from '@/components/SectionHeading'
import { experiments } from '@/data/site'

export default function WorkPage() {
  return (
    <div className="pb-20">
      <PageHero
        aside={{
          title: 'How experiments work',
          items: [
            'Hypothesis, motivation, expected cost',
            'Metrics, success criteria, failure criteria',
            'Duration, results, lessons learned',
          ],
        }}
        description="Every experiment contains a hypothesis, metrics, and published results. No experiment is complete without measurable evidence."
        eyebrow="Experiments"
        links={[
          { label: 'Read the vision', to: '/about' },
          { label: 'Get in touch', to: '/contact', variant: 'secondary' },
        ]}
        title="Engineering experiments with hypotheses, metrics, and published results."
      />

      <section className="layout-grid space-y-8 py-8 sm:py-12">
        <SectionHeading
          eyebrow="Active and planned"
          title="What the laboratory is testing."
          description="Each experiment asks a specific engineering question and ends with: adopt, reject, needs experiment, or needs human review."
        />

        <div className="grid gap-5">
          {experiments.map((experiment) => (
            <article className="panel-surface grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]" key={experiment.name}>
              <div className="panel-accent flex min-h-[14rem] flex-col justify-between rounded-[28px] p-6 lg:p-8">
                <div className="space-y-4">
                  <span className="eyebrow">{experiment.category}</span>
                  <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                    {experiment.name}
                  </h2>
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
                          <CheckCircle2 className="mt-0.5 h-4 w-4 text-[var(--brand)]" />
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

      <section className="layout-grid py-12 lg:py-16">
        <div className="panel-surface panel-accent grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="space-y-4">
            <span className="eyebrow">Transparency</span>
            <h2 className="max-w-2xl text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Failures are published alongside successes. Transparency increases credibility.
            </h2>
          </div>
          <Link className="button-primary" to="/about">
            Read the vision
          </Link>
        </div>
      </section>
    </div>
  )
}

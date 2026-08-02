import { Link } from 'react-router-dom'

import PageHero from '@/components/PageHero'
import { capabilities, processSteps } from '@/data/site'

export default function ServicesPage() {
  return (
    <div className="pb-20">
      <PageHero
        aside={{
          title: 'What the lab produces',
          items: [
            'Engineering research with clear decisions',
            'Production-grade software, validated',
            'Documentation for future engineers',
          ],
        }}
        description="Hermes researches, builds, documents, and experiments. Every output includes reason, risk, validation, and rollback strategy."
        eyebrow="Capabilities"
        links={[
          { label: 'See experiments', to: '/work' },
          { label: 'Read the vision', to: '/about', variant: 'secondary' },
        ]}
        title="What the laboratory produces."
      />

      <section className="layout-grid space-y-8 py-8 sm:py-12">
        <div className="grid gap-5 lg:grid-cols-3">
          {capabilities.map((capability) => (
            <article className="panel-surface flex h-full flex-col gap-6" key={capability.title}>
              <div className="icon-frame">
                <capability.icon className="h-5 w-5" />
              </div>
              <div className="space-y-3">
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">{capability.title}</h2>
                <p className="text-sm leading-7 text-slate-600 sm:text-base">{capability.summary}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="layout-grid space-y-8 py-12 lg:py-16">
        <div className="panel-soft">
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-slate-500">
            Operating cycle
          </p>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {processSteps.map((step, index) => (
              <div className="space-y-3" key={step.title}>
                <span className="text-sm font-medium text-slate-400">0{index + 1}</span>
                <h3 className="text-lg font-semibold tracking-tight text-slate-950">{step.title}</h3>
                <p className="text-sm leading-7 text-slate-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="layout-grid py-12 lg:py-16">
        <div className="panel-surface panel-accent grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="space-y-4">
            <span className="eyebrow">Before writing code</span>
            <h2 className="max-w-2xl text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Hermes asks: does this directly support an objective? If not, no code is written.
            </h2>
          </div>
          <Link className="button-primary" to="/work">
            See experiments
          </Link>
        </div>
      </section>
    </div>
  )
}

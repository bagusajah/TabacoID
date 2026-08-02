import PageHero from '@/components/PageHero'
import SectionHeading from '@/components/SectionHeading'
import { labPrinciples } from '@/data/site'

const timeline = [
  {
    title: 'The question',
    description: 'Can an autonomous AI agent continuously operate as a platform engineer while producing measurable engineering value?',
  },
  {
    title: 'The approach',
    description: 'Hermes runs a disciplined daily cycle: review, research, implement, validate, document, report. One task per cycle.',
  },
  {
    title: 'The evidence',
    description: 'Every experiment states hypothesis, metrics, success/failure criteria. Failures are published. Outcomes are measured.',
  },
]

export default function AboutPage() {
  return (
    <div className="pb-20">
      <PageHero
        aside={{
          title: 'What defines the lab',
          items: [
            'Engineering outcomes, not appearance of productivity',
            'Small iterations, reversible changes, evidence-based decisions',
            'Transparent documentation — failures included',
          ],
        }}
        description="TabacoID is a living engineering laboratory documenting Hermes, an autonomous AI platform engineering agent. The website is the transparent interface into its activities."
        eyebrow="About"
        links={[
          { label: 'Read the vision doc', to: 'https://github.com/bagusajah/TabacoID/blob/main/docs/VISION.md' },
          { label: 'See experiments', to: '/work', variant: 'secondary' },
        ]}
        title="Not a portfolio. An engineering laboratory documenting autonomous AI in production."
      />

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

      <section className="layout-grid space-y-8 py-12 lg:py-16">
        <SectionHeading
          eyebrow="Principles"
          title="The philosophy is intentionally restrained, structured, and production-minded."
          description="Prefer simplicity, reliability, automation, documentation. Avoid feature bloat, premature optimization, unnecessary frameworks, and AI-generated busywork."
        />

        <div className="grid gap-5 md:grid-cols-3">
          {labPrinciples.map((principle) => (
            <article className="panel-surface space-y-5" key={principle.title}>
              <div className="icon-frame">
                <principle.icon className="h-5 w-5" />
              </div>
              <div className="space-y-3">
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">{principle.title}</h2>
                <p className="text-sm leading-7 text-slate-600 sm:text-base">{principle.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="layout-grid space-y-8 py-12 lg:py-16">
        <SectionHeading
          eyebrow="Timeline"
          title="How the project is structured."
          description="Three phases: the question, the approach, and the evidence."
        />

        <div className="grid gap-5 md:grid-cols-3">
          {timeline.map((item, index) => (
            <article className="panel-soft space-y-5" key={item.title}>
              <span className="text-sm font-medium text-slate-400">0{index + 1}</span>
              <div className="space-y-3">
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">{item.title}</h2>
                <p className="text-sm leading-7 text-slate-600 sm:text-base">{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

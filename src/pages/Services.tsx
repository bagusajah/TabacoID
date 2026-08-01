import PageHero from '@/components/PageHero'
import SectionHeading from '@/components/SectionHeading'
import { processSteps, services } from '@/data/site'

const engagementModels = [
  {
    title: 'Launch sprint',
    description: 'For teams preparing a new offer, product release, or repositioning moment.',
  },
  {
    title: 'Focused redesign',
    description: 'For businesses that need a stronger structure, cleaner hierarchy, and more credible visual language.',
  },
  {
    title: 'Embedded studio support',
    description: 'For ongoing collaboration across strategy, interface design, and frontend improvements.',
  },
]

export default function ServicesPage() {
  return (
    <div className="pb-20">
      <PageHero
        aside={{
          title: 'What we optimize for',
          items: [
            'Sharper messaging and clearer service packaging',
            'Reusable page structures and scalable UI patterns',
            'A premium enterprise-light feel without unnecessary visual noise',
          ],
        }}
        description="TabacoID helps product and service teams turn scattered digital surfaces into cohesive experiences that look polished, communicate faster, and scale more easily."
        eyebrow="Services"
        links={[
          { label: 'See recent work', to: '/work' },
          { label: 'Discuss your project', to: '/contact', variant: 'secondary' },
        ]}
        title="Capabilities built for modern launches, redesigns, and high-trust product storytelling."
      />

      <section className="layout-grid space-y-8 py-8 sm:py-12">
        <SectionHeading
          eyebrow="Service areas"
          title="A modular set of services that can stand alone or work as one integrated studio pipeline."
          description="Most engagements combine strategy, design, and implementation so the final site feels coherent from top-level narrative down to interaction details."
        />

        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => (
            <article className="panel-surface flex h-full flex-col gap-6" key={service.title}>
              <div className="icon-frame">
                <service.icon className="h-5 w-5" />
              </div>

              <div className="space-y-3">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                  {service.title}
                </h2>
                <p className="text-sm leading-7 text-slate-600 sm:text-base">{service.summary}</p>
              </div>

              <div className="rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface)] p-5">
                <p className="text-sm font-medium uppercase tracking-[0.16em] text-slate-500">
                  Outcome
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">{service.outcome}</p>
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
      </section>

      <section className="layout-grid space-y-8 py-12 lg:py-16">
        <SectionHeading
          eyebrow="Operating model"
          title="We keep the process lean so direction, execution, and code quality stay connected."
          description="The studio is designed to move quickly without feeling improvised. Every engagement is grounded in a simple rhythm of audit, systems, and launch."
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
      </section>

      <section className="layout-grid py-12 lg:py-16">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
          <div className="panel-surface">
            <SectionHeading
              eyebrow="Engagement styles"
              title="A flexible model depending on how much change your business needs."
              description="Some clients need a focused site redesign. Others need a clearer product story, reusable sections, and frontend help to deliver everything in one flow."
            />
          </div>

          <div className="grid gap-5">
            {engagementModels.map((model) => (
              <article className="panel-soft space-y-3" key={model.title}>
                <h3 className="text-lg font-semibold tracking-tight text-slate-950">{model.title}</h3>
                <p className="text-sm leading-7 text-slate-600 sm:text-base">{model.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

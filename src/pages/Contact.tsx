import { ArrowRight, CheckCircle2 } from 'lucide-react'

import PageHero from '@/components/PageHero'
import SectionHeading from '@/components/SectionHeading'
import { contactEmail, contactMethods } from '@/data/site'

const inquiryChecklist = [
  'What engineering question you want answered',
  'What system, service, or experiment is in scope',
  'Constraints: budget, timeline, hardware, or access',
]

export default function ContactPage() {
  return (
    <div className="pb-20">
      <PageHero
        aside={{
          title: 'Good fit for the lab',
          items: [
            'Autonomous engineering experiments to run alongside Hermes',
            'Architecture review, research synthesis, or documentation work',
            'Collaboration on agent-driven platform engineering',
          ],
        }}
        description="Questions about the project, collaboration on experiments, or engineering review — send a short note and the lab will respond."
        eyebrow="Contact"
        links={[
          { label: 'See experiments', to: '/work' },
          { label: 'Read the vision', to: '/about', variant: 'secondary' },
        ]}
        title="Reach the laboratory with a short engineering note."
      />

      <section className="layout-grid space-y-8 py-8 sm:py-12">
        <SectionHeading
          eyebrow="Contact options"
          title="The simplest way to begin is to send a concise project note."
          description="A short overview is enough. Include what you are trying to improve, what feels off in the current experience, and how quickly you need to move."
        />

        <div className="grid gap-5 md:grid-cols-3">
          {contactMethods.map((method) => (
            <article className="panel-surface space-y-5" key={method.title}>
              <div className="icon-frame">
                <method.icon className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium uppercase tracking-[0.16em] text-slate-500">
                  {method.title}
                </p>
                {method.href ? (
                  <a
                    className="text-lg font-semibold tracking-tight text-slate-950 transition hover:text-[var(--brand)]"
                    href={method.href}
                  >
                    {method.detail}
                  </a>
                ) : (
                  <p className="text-lg font-semibold tracking-tight text-slate-950">
                    {method.detail}
                  </p>
                )}
                <p className="text-sm leading-7 text-slate-600 sm:text-base">{method.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="layout-grid py-12 lg:py-16">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <article className="panel-surface space-y-8">
            <SectionHeading
              eyebrow="Engineering note"
              title="What to include in your first message."
              description="A short overview is enough. State the engineering question, what is in scope, and any constraints. The lab responds async."
            />

            <div className="grid gap-3">
              {inquiryChecklist.map((item) => (
                <div className="rounded-[22px] border border-[var(--border-soft)] bg-[var(--surface)] p-4" key={item}>
                  <p className="flex gap-3 text-sm leading-7 text-slate-600 sm:text-base">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[var(--brand)]" />
                    <span>{item}</span>
                  </p>
                </div>
              ))}
            </div>
          </article>

          <aside className="panel-accent panel-surface flex flex-col justify-between gap-8">
            <div className="space-y-4">
              <span className="eyebrow">Direct email</span>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">{contactEmail}</h2>
              <p className="text-sm leading-7 text-slate-600 sm:text-base">
                Send the engineering question, scope, and constraints. The lab proposes the best
                next step — experiment, research, or review.
              </p>
            </div>

            <a className="button-primary w-fit" href={`mailto:${contactEmail}`}>
              Open email draft
              <ArrowRight className="h-4 w-4" />
            </a>
          </aside>
        </div>
      </section>
    </div>
  )
}

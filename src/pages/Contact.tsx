import { ArrowRight, CheckCircle2 } from 'lucide-react'

import PageHero from '@/components/PageHero'
import SectionHeading from '@/components/SectionHeading'
import { contactEmail, contactMethods } from '@/data/site'

const inquiryChecklist = [
  'What you are building or repositioning',
  'Where the current experience feels weak or outdated',
  'Any timing constraints, launch windows, or team realities',
]

export default function ContactPage() {
  return (
    <div className="pb-20">
      <PageHero
        aside={{
          title: 'Good fit for TabacoID',
          items: [
            'Website redesigns for product or service companies',
            'Marketing and product surfaces that need stronger hierarchy',
            'Teams that want both design and implementation thinking in one flow',
          ],
        }}
        description="If you need a more mature digital presence, a sharper product story, or a cleaner frontend system, get in touch and share a little context."
        eyebrow="Contact"
        links={[
          { label: 'Review work samples', to: '/work' },
          { label: 'Review services', to: '/services', variant: 'secondary' },
        ]}
        title="Start the conversation with a short project brief and we can take it from there."
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
              eyebrow="Project brief"
              title="What to include in your first message."
              description="You do not need a polished scope document. A simple note with the basics is enough to start a useful conversation."
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
                If the project feels aligned, send the essentials and TabacoID can propose the best
                next step from there.
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

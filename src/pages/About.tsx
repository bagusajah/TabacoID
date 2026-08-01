import PageHero from '@/components/PageHero'
import SectionHeading from '@/components/SectionHeading'
import { studioPrinciples } from '@/data/site'

const timeline = [
  {
    title: 'Product framing',
    description: 'Clarify the offer, audience, and business context before visual decisions begin.',
  },
  {
    title: 'System-led design',
    description: 'Build a language of sections, panels, badges, and typography that can scale across pages.',
  },
  {
    title: 'Delivery-minded implementation',
    description: 'Translate the design into maintainable frontend code that teams can continue using.',
  },
]

export default function AboutPage() {
  return (
    <div className="pb-20">
      <PageHero
        aside={{
          title: 'What defines the studio',
          items: [
            'Small, senior, and detail-oriented',
            'Design decisions tied to business communication',
            'Implementation that values structure as much as visuals',
          ],
        }}
        description="TabacoID is a digital product studio focused on premium, enterprise-light experiences for businesses that need their digital presence to feel more mature, coherent, and credible."
        eyebrow="About"
        links={[
          { label: 'View services', to: '/services' },
          { label: 'Get in touch', to: '/contact', variant: 'secondary' },
        ]}
        title="A lean studio approach built around clarity, systems thinking, and launch-ready execution."
      />

      <section className="layout-grid py-8 sm:py-12">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
          <article className="panel-surface">
            <SectionHeading
              eyebrow="Studio profile"
              title="We help teams move beyond portfolio aesthetics into product-grade communication."
              description="Many businesses outgrow their original site long before they replace it. TabacoID exists to bridge that gap with cleaner messaging, stronger hierarchy, and digital surfaces that feel ready for larger opportunities."
            />
          </article>

          <article className="panel-soft space-y-4">
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-slate-500">
              What clients usually say
            </p>
            <p className="text-lg leading-8 text-slate-700">
              “The product is stronger than the website.” That gap is exactly where TabacoID adds value.
            </p>
          </article>
        </div>
      </section>

      <section className="layout-grid space-y-8 py-12 lg:py-16">
        <SectionHeading
          eyebrow="Principles"
          title="The studio philosophy is intentionally restrained, structured, and production-minded."
          description="Rather than leaning on visual excess, the work focuses on confident surfaces, clear information hierarchy, and consistent patterns that can grow with the business."
        />

        <div className="grid gap-5 md:grid-cols-3">
          {studioPrinciples.map((principle) => (
            <article className="panel-surface space-y-5" key={principle.title}>
              <div className="icon-frame">
                <principle.icon className="h-5 w-5" />
              </div>
              <div className="space-y-3">
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                  {principle.title}
                </h2>
                <p className="text-sm leading-7 text-slate-600 sm:text-base">
                  {principle.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="layout-grid py-12 lg:py-16">
        <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="panel-soft space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-slate-500">
              How the work unfolds
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              A three-part rhythm from direction to delivery.
            </h2>
            <p className="text-sm leading-7 text-slate-600 sm:text-base">
              The process is designed to reduce handoff friction and keep the final output aligned with the original business goal.
            </p>
          </aside>

          <div className="grid gap-5">
            {timeline.map((item, index) => (
              <article className="panel-surface flex gap-5" key={item.title}>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] text-sm font-semibold text-slate-500">
                  0{index + 1}
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold tracking-tight text-slate-950">{item.title}</h3>
                  <p className="text-sm leading-7 text-slate-600 sm:text-base">{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

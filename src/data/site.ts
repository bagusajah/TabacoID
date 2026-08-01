import {
  BarChart3,
  Blocks,
  CheckCircle2,
  Clock3,
  Code2,
  Compass,
  LayoutGrid,
  Mail,
  PenTool,
  Rocket,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Users2,
  Workflow,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  label: string
  path: string
}

export type Stat = {
  label: string
  value: string
  detail: string
}

export type Service = {
  title: string
  summary: string
  outcome: string
  bullets: string[]
  icon: LucideIcon
}

export type Project = {
  name: string
  category: string
  summary: string
  challenge: string
  impact: string[]
  tags: string[]
}

export type Principle = {
  title: string
  description: string
  icon: LucideIcon
}

export type ContactMethod = {
  title: string
  detail: string
  description: string
  href?: string
  icon: LucideIcon
}

export const brandName = 'TabacoID'
export const contactEmail = 'bagusmukmin@tabaco.id'

export const navItems: NavItem[] = [
  { label: 'Home', path: '/' },
  { label: 'Services', path: '/services' },
  { label: 'Work', path: '/work' },
  { label: 'About', path: '/about' },
  { label: 'Contact', path: '/contact' },
]

export const studioStats: Stat[] = [
  {
    label: 'End-to-end delivery',
    value: 'Strategy to launch',
    detail: 'From framing the opportunity to shipping polished interfaces.',
  },
  {
    label: 'Senior execution',
    value: 'Lean and hands-on',
    detail: 'Design, product thinking, and frontend implementation stay closely aligned.',
  },
  {
    label: 'Output quality',
    value: 'Production-ready systems',
    detail: 'Clean structure, scalable UI patterns, and responsive experiences.',
  },
]

export const services: Service[] = [
  {
    title: 'Product Strategy',
    summary: 'Turn business goals into clear product direction, feature priorities, and launch-ready plans.',
    outcome: 'Sharper scope, faster decisions, stronger product-market positioning.',
    bullets: ['Product framing workshops', 'Opportunity mapping', 'Roadmap and scope definition'],
    icon: Compass,
  },
  {
    title: 'Experience Design',
    summary: 'Design elegant user journeys, interface systems, and storytelling layers for modern digital products.',
    outcome: 'Interfaces that feel trustworthy, clear, and ready for real customers.',
    bullets: ['UX flows and wireframes', 'Visual direction and UI systems', 'Responsive page and product design'],
    icon: PenTool,
  },
  {
    title: 'Frontend Systems',
    summary: 'Build maintainable React frontends with reusable components and implementation discipline.',
    outcome: 'High-quality experiences that ship cleanly and scale with less rework.',
    bullets: ['React architecture', 'Reusable section and component systems', 'Performance-minded responsive implementation'],
    icon: Code2,
  },
  {
    title: 'Design Systems',
    summary: 'Create shared tokens, patterns, and content structures that keep teams moving in one direction.',
    outcome: 'Consistent execution across marketing, product, and growth surfaces.',
    bullets: ['Token foundations', 'Component patterns', 'Documentation-ready UI conventions'],
    icon: LayoutGrid,
  },
  {
    title: 'Launch Optimization',
    summary: 'Shape narrative, conversion touchpoints, and post-launch refinements around real user behavior.',
    outcome: 'Sharper messaging and better-performing customer journeys.',
    bullets: ['Conversion review', 'Content hierarchy refinement', 'Iteration planning after release'],
    icon: BarChart3,
  },
  {
    title: 'Delivery Operations',
    summary: 'Set up practical working rhythms so stakeholders, design, and engineering stay synchronized.',
    outcome: 'Less handoff friction and a more dependable path from idea to release.',
    bullets: ['Weekly delivery rituals', 'Decision logs and priorities', 'Execution visibility for stakeholders'],
    icon: Workflow,
  },
]

export const featuredProjects: Project[] = [
  {
    name: 'Atlas Commerce Suite',
    category: 'B2B commerce platform',
    summary: 'Repositioned a fragmented admin experience into a confident platform narrative with a clearer conversion path.',
    challenge: 'The product had depth, but the market-facing surface felt tactical and difficult to trust at a glance.',
    impact: ['Unified story across product and marketing', 'Modular UI system for future pages', 'Clearer enterprise buying signals'],
    tags: ['Positioning', 'Marketing site', 'Design system'],
  },
  {
    name: 'Northstar Ops Cloud',
    category: 'Operations SaaS',
    summary: 'Designed a launch website and onboarding entry points that translated a complex platform into decisive business value.',
    challenge: 'Multiple stakeholder priorities created a diluted message and inconsistent interaction quality.',
    impact: ['Sharper service packaging', 'Reusable product storytelling sections', 'Faster route to launch readiness'],
    tags: ['UX strategy', 'React implementation', 'Responsive design'],
  },
  {
    name: 'Linea Health Portal',
    category: 'Service and product experience',
    summary: 'Built a calmer, more credible digital presence with service explanation, product framing, and contact pathways.',
    challenge: 'The team needed a premium presence without relying on heavy visuals or generic agency tropes.',
    impact: ['Improved information hierarchy', 'Trust-building proof points', 'Flexible content architecture for growth'],
    tags: ['Content architecture', 'UI design', 'Frontend system'],
  },
]

export const processSteps: Principle[] = [
  {
    title: 'Audit what matters',
    description: 'We start by clarifying the offer, audience, and blockers so the work is focused from day one.',
    icon: ScanSearch,
  },
  {
    title: 'Shape the system',
    description: 'We turn direction into reusable sections, messaging structure, and a dependable visual language.',
    icon: Blocks,
  },
  {
    title: 'Ship with precision',
    description: 'We implement responsive experiences with clean code, clear hierarchy, and launch-ready polish.',
    icon: Rocket,
  },
]

export const studioPrinciples: Principle[] = [
  {
    title: 'Clarity over clutter',
    description: 'Every page is designed to reduce decision friction and help people understand the offer faster.',
    icon: Sparkles,
  },
  {
    title: 'Systems over one-offs',
    description: 'Reusable sections and consistent patterns create a better experience for both teams and visitors.',
    icon: ShieldCheck,
  },
  {
    title: 'Senior, lean, direct',
    description: 'TabacoID works close to the product and avoids unnecessary layers between decisions and delivery.',
    icon: Users2,
  },
]

export const contactMethods: ContactMethod[] = [
  {
    title: 'Email',
    detail: contactEmail,
    description: 'Best for new projects, redesigns, retainers, and product collaboration inquiries.',
    href: `mailto:${contactEmail}`,
    icon: Mail,
  },
  {
    title: 'Engagement model',
    detail: 'Project-based or retained',
    description: 'Flexible support for launch sprints, redesigns, and ongoing product studio work.',
    icon: CheckCircle2,
  },
  {
    title: 'Working cadence',
    detail: 'Async-first with clear weekly checkpoints',
    description: 'A structured delivery rhythm that keeps decisions moving without unnecessary meetings.',
    icon: Clock3,
  },
]

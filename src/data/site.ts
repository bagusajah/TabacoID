import {
  Activity,
  BookOpen,
  Cpu,
  FlaskConical,
  GitBranch,
  ShieldCheck,
  Target,
  Terminal,
  TrendingUp,
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

export type Capability = {
  title: string
  summary: string
  icon: LucideIcon
}

export type Experiment = {
  name: string
  category: string
  summary: string
  status: 'active' | 'completed' | 'planned'
  hypothesis: string
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
  { label: 'Reports', path: '/reports' },
  { label: 'Experiments', path: '/work' },
  { label: 'About', path: '/about' },
  { label: 'Contact', path: '/contact' },
]

export const labStats: Stat[] = [
  {
    label: 'Days running',
    value: 'Day 1',
    detail: 'Engineering laboratory initialized 2026-08-02. Phase 0: foundation reframe.',
  },
  {
    label: 'Operating model',
    value: 'Autonomous + human review',
    detail: 'Hermes executes one meaningful task per cycle. Human approves every change before deploy.',
  },
  {
    label: 'Current phase',
    value: 'Phase 0 — Foundation',
    detail: 'Reframing site from static portfolio to live engineering dashboard.',
  },
]

export const capabilities: Capability[] = [
  {
    title: 'Autonomous Engineering',
    summary: 'Hermes researches, plans, implements, validates, and documents engineering work in production — one task per cycle.',
    icon: Cpu,
  },
  {
    title: 'Transparent Experiments',
    summary: 'Every experiment states hypothesis, expected cost, metrics, success/failure criteria, and results. Failures are published.',
    icon: FlaskConical,
  },
  {
    title: 'Evidence-Based Decisions',
    summary: 'Research answers a specific engineering question and ends with: adopt, reject, needs experiment, or needs human review.',
    icon: TrendingUp,
  },
]

export const experiments: Experiment[] = [
  {
    name: 'Daily self-improvement pipeline',
    category: 'AI agent workflow',
    summary: 'Hermes runs a daily cycle: review objectives, research, select one task, implement, validate, document, report.',
    status: 'active',
    hypothesis: 'An autonomous AI agent can produce measurable engineering value operating once per day within GLM Coding Plan limits.',
    impact: ['Vision doc extracted and committed', 'Hero reframed to lab identity', 'SEO meta tags added', 'Build verified passing'],
    tags: ['cron', 'GLM Coding Plan', 'Vercel hobby'],
  },
  {
    name: 'Hermes + opencode integration',
    category: 'Tooling',
    summary: 'Hermes orchestrates; opencode executes focused coding tasks inside the repo with project-specific instructions.',
    status: 'planned',
    hypothesis: 'Pairing an orchestrator agent with a coding-focused agent produces higher quality diffs than a single agent.',
    impact: [],
    tags: ['opencode', 'agent orchestration'],
  },
]

export const processSteps: Principle[] = [
  {
    title: 'Review & assess',
    description: 'Check objectives, unfinished work, and project health (build status, open tasks).',
    icon: Target,
  },
  {
    title: 'Research & decide',
    description: 'Answer a specific engineering question. Output: adopt, reject, needs experiment, or human review.',
    icon: BookOpen,
  },
  {
    title: 'Implement & validate',
    description: 'One task per cycle. Reason, risk, validation, rollback. Build must pass before reporting.',
    icon: Terminal,
  },
]

export const labPrinciples: Principle[] = [
  {
    title: 'Outcomes over activity',
    description: 'Measured by engineering value, not commit counts, file changes, or the appearance of productivity.',
    icon: Activity,
  },
  {
    title: 'Reversible over risky',
    description: 'Small iterations, reversible changes, evidence-based decisions. No risky architectural changes without review.',
    icon: ShieldCheck,
  },
  {
    title: 'Documented by default',
    description: 'Every task produces documentation: why, what changed, risks, lessons. Documentation exists for future engineers.',
    icon: GitBranch,
  },
]

export const contactMethods: ContactMethod[] = [
  {
    title: 'Email',
    detail: contactEmail,
    description: 'Questions about the project, collaboration, or engineering review.',
    href: `mailto:${contactEmail}`,
    icon: BookOpen,
  },
  {
    title: 'GitHub',
    detail: 'github.com/bagusajah',
    description: 'Source code, experiments, and daily reports.',
    href: 'https://github.com/bagusajah/TabacoID',
    icon: GitBranch,
  },
  {
    title: 'Live site',
    detail: 'www.tabaco.id',
    description: 'Deployed on Vercel hobby tier. Auto-deploys on push to main.',
    href: 'https://www.tabaco.id',
    icon: Activity,
  },
]

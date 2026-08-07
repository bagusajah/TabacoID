import {
  Activity,
  Cpu,
  FlaskConical,
  GitBranch,
  ShieldCheck,
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
  outcome: string
  reportSlug?: string
  tags: string[]
}

export type Principle = {
  title: string
  description: string
  icon: LucideIcon
}

export type SystemEntry = {
  name: string
  stack: string
  role: string
}

export type Objective = {
  id: string
  title: string
  success_metric: string
}

export const brandName = 'TabacoID'
export const contactEmail = 'bagusmukmin@tabaco.id'
export const githubUrl = 'https://github.com/bagusajah/TabacoID'

export const navItems: NavItem[] = [
  { label: 'Home', path: '/' },
  { label: 'Reports', path: '/reports' },
  { label: 'About', path: '/about' },
]

// Build-time constants — updated when site is rebuilt
export const tasksCompleted = 121
export const objectivesTracked = 5

const INIT_DATE = '2026-08-02'

export function computeDaysRunning(now: Date = new Date()): number {
  const start = new Date(INIT_DATE + 'T00:00:00Z')
  return Math.max(1, Math.ceil((now.getTime() - start.getTime()) / 86_400_000))
}

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
    name: 'RK3588 IOWait forensics',
    category: 'Infrastructure',
    summary: 'Load average of 4.2 on a 4-core board triggered investigation. Root cause: kernel accounting bug, not real I/O bottleneck.',
    status: 'completed',
    hypothesis: 'The reported high iowait is a kernel accounting artifact on RK3588, not a real I/O bottleneck.',
    outcome: 'Adopt — confirmed kernel bug. IOWait reads ~12% are phantom. No hardware change needed.',
    reportSlug: '2026-08-07-phantom-load-rk3588',
    tags: ['rk3588', 'kernel', 'iowait'],
  },
  {
    name: 'Gateway memory leak investigation',
    category: 'Infrastructure',
    summary: 'Gateway RSS trending upward over days. Profiled with tracemalloc, identified scope stack imbalance in relay runtime.',
    status: 'completed',
    hypothesis: 'Gateway memory growth is caused by scope stack corruption in end_turn/close_session race.',
    outcome: 'Adopt — root cause identified. gc.collect() deployed, monitoring 24-48h for stabilization.',
    reportSlug: '2026-08-07-gateway-memory-trend',
    tags: ['gateway', 'memory', 'debugging'],
  },
  {
    name: 'zram vs NVMe swap evaluation',
    category: 'Operations',
    summary: 'Tested whether zram-heavy workload should migrate to NVMe swap file. Result: zram is optimal at current load.',
    status: 'completed',
    hypothesis: 'zram remains optimal for the current workload profile; NVMe swap migration is unnecessary.',
    outcome: 'Reject — no migration. Swap utilization 2.9%, compression 2.98x, I/O negligible.',
    reportSlug: '2026-08-07-swap-zram-vs-nvme',
    tags: ['zram', 'nvme', 'swap'],
  },
  {
    name: 'v0.4 Task Orchestration',
    category: 'Architecture',
    summary: 'Adopted Kanban as engineering control plane. Separated planner, executor, reviewer, and retrospective into distinct cron jobs.',
    status: 'active',
    hypothesis: 'A structured Kanban with objectives, experiments, and task traceability improves engineering governance over flat cron+markdown.',
    outcome: 'In progress — objectives seeded, planner/executor split deployed, report review gate added.',
    tags: ['kanban', 'cron', 'architecture'],
  },
]

export const processSteps: Principle[] = [
  {
    title: 'Review & assess',
    description: 'Check objectives, unfinished work, and project health (build status, open tasks).',
    icon: Terminal,
  },
  {
    title: 'Research & decide',
    description: 'Answer a specific engineering question. Output: adopt, reject, needs experiment, or human review.',
    icon: GitBranch,
  },
  {
    title: 'Implement & validate',
    description: 'One task per cycle. Reason, risk, validation, rollback. Build must pass before reporting.',
    icon: Cpu,
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

export const systems: SystemEntry[] = [
  { name: 'TabacoID', stack: 'Vite + React 18 + TS + Tailwind 3', role: 'This website. Vercel hobby deploy.' },
  { name: 'Hermes Agent', stack: 'Python, GLM-5.2, SQLite Kanban', role: 'The brain. Cron-driven engineering cycles.' },
  { name: 'Webreader', stack: 'Docker (api:8787, nginx:8181)', role: 'TICMI proxy API for IDX market data.' },
  { name: 'Dashboard', stack: 'systemd user service, :9119', role: 'Hermes status dashboard with 5-min watchdog.' },
  { name: 'Host', stack: 'Orange Pi RK3588, 8GB RAM, Ubuntu', role: 'Runs everything. NVMe boot, zram swap.' },
  { name: 'VPS', stack: 'nginx reverse proxy, TLS', role: 'Routes hermes.tabaco.id → Pi via Tailscale.' },
  { name: 'CICD Console', stack: 'Node.js + React + Sequelize', role: 'CI/CD release orchestration for OCP/K8s.' },
]

export const objectives: Objective[] = [
  { id: 'OBJ-001', title: 'Demonstrate autonomous engineering value', success_metric: 'measurable engineering outcomes over months' },
  { id: 'OBJ-002', title: 'Maintain production-grade infrastructure', success_metric: 'uptime > 99%, incidents < 2/week' },
  { id: 'OBJ-003', title: 'Validate AI engineering concepts', success_metric: '≥1 completed experiment/month with evidence' },
  { id: 'OBJ-004', title: 'Keep operational costs sustainable', success_metric: 'monthly cost < $10, free tier first' },
  { id: 'OBJ-005', title: 'Continuously improve workflows', success_metric: 'cycle time decreasing, quality improving' },
]

import { useT } from '@/i18n'
import SectionHeading from '@/components/SectionHeading'

// The four cron jobs that form the v0.4 cycle
const cycle = [
  { phase: 'Planner', schedule: '2× daily', role: 'Scan system signals → create rich tasks → link to objectives', color: '#6366f1' },
  { phase: 'Executor', schedule: 'every 30m', role: 'Claim ready task → execute → measure → draft report → complete/block', color: '#06b6d4' },
  { phase: 'Reviewer', schedule: 'daily', role: 'Validate draft reports → promote to published or send feedback', color: '#10b981' },
  { phase: 'Retrospective', schedule: 'weekly', role: 'Synthesize trends → flag bad decisions → create follow-ups', color: '#f59e0b' },
]

const systems = [
  { name: 'Orange Pi RK3588', role: 'Host — 8GB RAM, NVMe, zram', stack: 'Ubuntu, Docker, systemd' },
  { name: 'Hermes Agent', role: 'The brain — GLM-5.2, SQLite Kanban', stack: 'Python, cron-driven cycles' },
  { name: 'Gateway + WhatsApp', role: 'Messaging bridge — :3000', stack: 'Node.js bridge, systemd' },
  { name: 'Dashboard', role: 'Status page — :9119', stack: 'systemd user service' },
  { name: 'Webreader', role: 'TICMI proxy — :8787 / :8181', stack: 'Docker (api + nginx)' },
  { name: 'VPS', role: 'Reverse proxy — TLS termination', stack: 'nginx → Pi via Tailscale' },
  { name: 'Vercel', role: 'Website deploy — auto on push', stack: 'This site you are viewing' },
]

export default function WorkflowPage() {
  const t = useT()

  return (
    <div className="pb-20">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.12),transparent_42%)]" />
        <div className="layout-grid space-y-8 py-16 lg:py-24">
          <div className="max-w-3xl space-y-4">
            <span className="eyebrow">{t['wf.eyebrow']}</span>
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              {t['wf.title']}
            </h1>
            <p className="text-lg leading-8 text-slate-600">
              {t['wf.subtitle']}
            </p>
          </div>

          {/* Cycle diagram */}
          <div className="panel-surface overflow-x-auto p-8">
            <CycleDiagram />
          </div>
        </div>
      </section>

      {/* Cycle details */}
      <section className="section-band section-band-muted">
        <div className="layout-grid space-y-8 py-12 lg:py-16">
          <SectionHeading
            eyebrow={t['wf.cycle.eyebrow']}
            title={t['wf.cycle.title']}
            description={t['wf.cycle.desc']}
          />
          <div className="grid gap-5 lg:grid-cols-4">
            {cycle.map((c, i) => (
              <article className="panel-surface space-y-4" key={c.phase}>
                <div className="flex items-center justify-between">
                  <span
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold text-white"
                    style={{ backgroundColor: c.color }}
                  >
                    {i + 1}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                    {c.schedule}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">{c.phase}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{c.role}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Systems topology */}
      <section className="layout-grid space-y-8 py-12 lg:py-16">
        <SectionHeading
          eyebrow={t['wf.sys.eyebrow']}
          title={t['wf.sys.title']}
          description={t['wf.sys.desc']}
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {systems.map((sys) => (
            <article className="panel-soft space-y-2" key={sys.name}>
              <h3 className="text-base font-semibold text-slate-950">{sys.name}</h3>
              <p className="text-sm text-slate-600">{sys.role}</p>
              <p className="text-xs font-mono text-[var(--brand)]">{sys.stack}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Decision flow */}
      <section className="section-band section-band-soft">
        <div className="layout-grid space-y-8 py-12 lg:py-16">
          <SectionHeading
            eyebrow={t['wf.flow.eyebrow']}
            title={t['wf.flow.title']}
            description={t['wf.flow.desc']}
          />
          <div className="panel-surface overflow-x-auto p-8">
            <DecisionFlow />
          </div>
        </div>
      </section>
    </div>
  )
}

/* --- SVG diagrams: native, no libs --- */

function CycleDiagram() {
  // 4 nodes in a ring around a central Kanban node
  const cx = 400, cy = 250, r = 165
  const nodes = [
    { ...cycle[0], x: cx, y: cy - r },
    { ...cycle[1], x: cx + r * 1.15, y: cy + r * 0.35 },
    { ...cycle[2], x: cx - r * 0.6, y: cy + r * 1.05 },
    { ...cycle[3], x: cx - r * 1.45, y: cy + r * 0.35 },
  ]

  return (
    <svg viewBox="0 0 800 500" className="mx-auto w-full min-w-[600px]" role="img" aria-label="Engineering cycle topology">
      {/* Arrows between nodes (clockwise) */}
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#cbd5e1" />
        </marker>
      </defs>

      {/* Center node: Kanban */}
      <ellipse cx={cx} cy={cy} rx="75" ry="40" fill="#0f172a" stroke="#1e293b" strokeWidth="2" />
      <text x={cx} y={cy - 4} textAnchor="middle" fill="white" fontSize="13" fontWeight="600">Kanban</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="#94a3b8" fontSize="10">SQLite control plane</text>

      {/* Connectors center → each node */}
      {nodes.map((n) => (
        <line key={`c-${n.phase}`} x1={cx} y1={cy} x2={n.x} y2={n.y}
          stroke="#e2e8f0" strokeWidth="1.5" strokeDasharray="4 4" />
      ))}

      {/* Clockwise arrows between nodes */}
      {nodes.map((n, i) => {
        const next = nodes[(i + 1) % nodes.length]
        return <ArrowLine key={`a-${n.phase}`} from={n} to={next} />
      })}

      {/* Node bubbles */}
      {nodes.map((n) => (
        <g key={n.phase}>
          <circle cx={n.x} cy={n.y} r="48" fill="white" stroke={n.color} strokeWidth="2.5" />
          <text x={n.x} y={n.y - 4} textAnchor="middle" fill="#0f172a" fontSize="11" fontWeight="700">{n.phase}</text>
          <text x={n.x} y={n.y + 12} textAnchor="middle" fill="#64748b" fontSize="9">{n.schedule}</text>
        </g>
      ))}
    </svg>
  )
}

function ArrowLine({ from, to }: { from: { x: number; y: number; r?: number }, to: { x: number; y: number; r?: number } }) {
  // Shorten line so arrow doesn't overlap circles
  const dx = to.x - from.x, dy = to.y - from.y
  const len = Math.sqrt(dx * dx + dy * dy)
  const ux = dx / len, uy = dy / len
  const fromR = 50, toR = 56 // account for circle radius + arrowhead
  return (
    <line
      x1={from.x + ux * fromR} y1={from.y + uy * fromR}
      x2={to.x - ux * toR} y2={to.y - uy * toR}
      stroke="#cbd5e1" strokeWidth="2" markerEnd="url(#arrowhead)"
    />
  )
}

function DecisionFlow() {
  const labels = useT()
  // Horizontal flow: Ready → Claimed → Execute → Measure → Report → [Done | Blocked]
  const steps = [
    { label: labels['wf.s.ready'] || 'Ready', sub: 'Kanban', color: '#6366f1' },
    { label: labels['wf.s.claim'] || 'Claim', sub: 'status=running', color: '#06b6d4' },
    { label: labels['wf.s.execute'] || 'Execute', sub: labels['wf.s.execute.sub'] || '1 task / cycle', color: '#0891b2' },
    { label: labels['wf.s.measure'] || 'Measure', sub: labels['wf.s.measure.sub'] || '≥1 metric', color: '#0d9488' },
    { label: labels['wf.s.report'] || 'Draft Report', sub: labels['wf.s.report.sub'] || 'docs/reports/draft/', color: '#10b981' },
  ]
  const w = 140, h = 60, gap = 20, startX = 30, y = 60
  const ends = [
    { label: labels['wf.s.done'] || 'Done', sub: 'reviewer promotes', color: '#22c55e', x: 30, y: 200 },
    { label: labels['wf.s.blocked'] || 'Blocked', sub: labels['wf.s.blocked.sub'] || 'needs human', color: '#f43f5e', x: 190, y: 200 },
  ]

  return (
    <svg viewBox="0 0 880 280" className="mx-auto w-full min-w-[700px]" role="img" aria-label="Task decision flow">
      <defs>
        <marker id="arrow2" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
        </marker>
      </defs>

      {/* Horizontal steps */}
      {steps.map((s, i) => {
        const x = startX + i * (w + gap)
        return (
          <g key={s.label}>
            <rect x={x} y={y} width={w} height={h} rx="10" fill="white" stroke={s.color} strokeWidth="2" />
            <text x={x + w / 2} y={y + 24} textAnchor="middle" fontSize="13" fontWeight="600" fill="#0f172a">{s.label}</text>
            <text x={x + w / 2} y={y + 42} textAnchor="middle" fontSize="10" fill="#64748b">{s.sub}</text>
            {i < steps.length - 1 && (
              <line x1={x + w} y1={y + h / 2} x2={x + w + gap} y2={y + h / 2}
                stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrow2)" />
            )}
          </g>
        )
      })}

      {/* Arrow from report down to decision split */}
      <line x1={startX + 4 * (w + gap) + w / 2} y1={y + h}
        x2={startX + 4 * (w + gap) + w / 2} y2={175}
        stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrow2)" />

      {/* Arrows to outcomes */}
      <line x1={startX + 4 * (w + gap) + w / 2 - 30} y1={175}
        x2={ends[0].x + 50} y2={ends[0].y - 5}
        stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrow2)" />
      <line x1={startX + 4 * (w + gap) + w / 2 + 30} y1={175}
        x2={ends[1].x + 50} y2={ends[1].y - 5}
        stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrow2)" />

      {/* Outcome nodes */}
      {ends.map((e) => (
        <g key={e.label}>
          <rect x={e.x} y={e.y} width={140} height={50} rx="10" fill={e.color + '15'} stroke={e.color} strokeWidth="2" />
          <text x={e.x + 70} y={e.y + 22} textAnchor="middle" fontSize="13" fontWeight="700" fill={e.color}>{e.label}</text>
          <text x={e.x + 70} y={e.y + 38} textAnchor="middle" fontSize="10" fill="#64748b">{e.sub}</text>
        </g>
      ))}
    </svg>
  )
}

// Shared parsing/rendering for report-style markdown pages (reports + trending).

export interface Report {
  slug: string
  title: string
  date: string
  category: string
  decision: string
  summary: string
  humanReview: string
  status: string
  html: string
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function extractSummary(md: string): string {
  // Pull the first paragraph from the question/findings section
  const q = md.match(/^##\s+(?:Engineering Question|Pertanyaan[^\n]*|Why[^\n]*)\s*\n(.+?)(?:\n#|\n##|$(?![\s\S]))/ms)
  if (q) return q[1].trim().replace(/\n/g, ' ')
  // Fallback: first non-frontmatter, non-heading, non-table paragraph
  // (daily digests open with a markdown table — never summarize that).
  const stripped = md
    .replace(/^---[\s\S]*?---\n?/m, '')
    .replace(/^#+\s.+$/gm, '')
    .replace(/^\|.+$/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .trim()
  return stripped.split(/\n\n/)[0]?.replace(/^>\s?/gm, '').replace(/\*\*/g, '').replace(/\n/g, ' ') || ''
}

export function stripAndRender(md: string): string {
  // Escape first: every rule below only adds our own tags, so raw HTML in the markdown
  // (prose or link URLs) can never reach dangerouslySetInnerHTML unescaped.
  return escapeHtml(md)
    .replace(/^---[\s\S]*?---\n?/m, '')
    .replace(/^### (.+)$/gm, '<h4 class="text-base font-semibold text-slate-800 mt-5 mb-1">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="text-lg font-semibold text-slate-900 mt-6 mb-2">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="text-xl font-semibold text-slate-950 mt-6 mb-2">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="rounded bg-slate-100 px-1.5 py-0.5 text-sm font-mono text-slate-700">$1</code>')
    .replace(/```[\s\S]*?```/g, (match) => {
      const code = match.replace(/```\w*\n?/, '').replace(/```$/, '')
      return `<pre class="rounded-lg bg-slate-900 p-4 text-sm text-slate-200 overflow-x-auto my-3"><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`
    })
    .replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match.split('|').filter(c => c.trim())
      const tag = cells.every(c => /^[\s-:]+$/.test(c)) ? '' : 'tr'
      if (!tag) return ''
      return `<tr>${cells.map(c => `<td class="border-b border-slate-200 px-3 py-1.5 text-sm">${c.trim()}</td>`).join('')}</tr>`
    })
    .replace(/((?:<tr>.*<\/tr>\s*)+)/g, '<div class="overflow-x-auto"><table class="w-full my-3">$1</table></div>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-sm leading-7 text-slate-600 list-disc">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 text-sm leading-7 text-slate-600 list-decimal">$1</li>')
    .replace(/^---$/gm, '<hr class="my-6 border-slate-200" />')
    .replace(/^(?!<[hprtluo])((?!<).+)$/gm, '<p class="text-sm leading-7 text-slate-600 my-1">$1</p>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a class="text-indigo-600 hover:underline break-all" href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
}

const decisionLabels: [RegExp, string][] = [
  [/^adopt\b/i, 'Adopt'],
  [/^reject\b/i, 'Reject'],
  [/^needs experiment\b/i, 'Needs experiment'],
  [/^needs human review\b/i, 'Needs human review'],
]

// Badge comes from the first non-empty line under "## Decision", reduced to a known label.
function extractDecision(md: string): string {
  const line = md.match(/^##\s+Decision[^\n]*\n+([^\n]+)/im)?.[1].replace(/^[\s*_>#-]+/, '') || ''
  return decisionLabels.find(([re]) => re.test(line))?.[1] || ''
}

export function parseReport(slug: string, raw: string): Report {
  const frontmatter = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] || ''
  const titleMatch = raw.match(/^# (.+)$/m)
  const dateMatch = frontmatter.match(/^date:\s*["']?(\d{4}-\d{2}-\d{2})/m) || slug.match(/^(\d{4}-\d{2}-\d{2})/)
  const catMatch = raw.match(/Category:\s*(.+)/i)
  const reviewMatch = raw.match(/human_review:\s*(\S+)/)
  const statusMatch = frontmatter.match(/^status:\s*["']?([\w-]+)/m)
  // Monthly slugs (monthly-2026-09) never match the ^YYYY-MM-DD pattern and lack
  // frontmatter dates — derive YYYY-MM-01 so archives sort chronologically.
  // Week-numbered slugs (2026-32-retrospective) keep the legacy slice fallback.
  const monthMatch = slug.startsWith('monthly-') ? slug.match(/(\d{4}-\d{2})/) : null
  const dateIso = dateMatch?.[1] || (monthMatch ? `${monthMatch[1]}-01` : slug.slice(0, 10))

  return {
    slug,
    title: titleMatch?.[1]?.trim() || slug,
    date: dateIso,
    // ponytail: keeps legacy 'Engineering' default consumed by Reports filter tabs —
    // Trending cards instead omit the category badge entirely (no fabricated labels).
    category: catMatch?.[1]?.trim() || 'Engineering',
    decision: extractDecision(raw),
    summary: extractSummary(raw),
    humanReview: reviewMatch?.[1]?.trim() || 'autonomous',
    status: statusMatch?.[1]?.toLowerCase() || '',
    html: stripAndRender(raw),
  }
}

// Only `status: published` is public. Files with no status line at all (trending digests,
// reports that predate the field) count as published; any other value is hidden.
export function isPublished(report: Report): boolean {
  return report.status === '' || report.status === 'published'
}

export const decisionColors: Record<string, string> = {
  adopt: 'bg-green-100 text-green-700',
  reject: 'bg-red-100 text-red-700',
  'needs experiment': 'bg-amber-100 text-amber-700',
  'needs human review': 'bg-blue-100 text-blue-700',
}

export const reviewConfig: Record<string, { label: string; label_id: string; class: string }> = {
  autonomous: { label: 'Autonomous', label_id: 'Otonom', class: 'bg-slate-100 text-slate-600' },
  approved: { label: 'Human-approved', label_id: 'Manusia approve', class: 'bg-blue-50 text-blue-600' },
  rejected: { label: 'Human-rejected', label_id: 'Manusia tolak', class: 'bg-red-50 text-red-600' },
}

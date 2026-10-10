// Shared parsing/rendering for report-style markdown pages (reports + trending).

export interface Report {
  slug: string
  title: string
  date: string
  category: string
  decision: string
  summary: string
  humanReview: string
  html: string
}

export function extractSummary(md: string): string {
  // Pull the first paragraph from the question/findings section
  const q = md.match(/^##\s+(?:Engineering Question|Pertanyaan[^\n]*|Why[^\n]*)\s*\n(.+?)(?:\n#|\n##|Z)/ms)
  if (q) return q[1].trim().replace(/\n/g, ' ')
  // Fallback: first non-frontmatter, non-heading paragraph
  const stripped = md
    .replace(/^---[\s\S]*?---\n?/m, '')
    .replace(/^#+\s.+$/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .trim()
  return stripped.split(/\n\n/)[0]?.replace(/\n/g, ' ') || ''
}

export function stripAndRender(md: string): string {
  return md
    .replace(/<[^>]*>/g, '')
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
    .replace(/((?:<tr>.*<\/tr>\s*)+)/g, '<table class="w-full my-3">$1</table>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-sm leading-7 text-slate-600 list-disc">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 text-sm leading-7 text-slate-600 list-decimal">$1</li>')
    .replace(/^(?!<[hprtluo])((?!<).+)$/gm, '<p class="text-sm leading-7 text-slate-600 my-1">$1</p>')
    .replace(/^---$/gm, '<hr class="my-6 border-slate-200" />')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a class="text-indigo-600 hover:underline break-all" href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
}

export function parseReport(slug: string, raw: string): Report {
  const titleMatch = raw.match(/^# (.+)$/m)
  const dateMatch = raw.match(/\b(\d{4}-\d{2}-\d{2})\b/)
  const catMatch = raw.match(/Category:\s*(.+)/i)
  const decMatch = raw.match(/Decision:\s*(.+)/i)
  const reviewMatch = raw.match(/human_review:\s*(\S+)/)

  return {
    slug,
    title: titleMatch?.[1]?.trim() || slug,
    date: dateMatch?.[1] || slug.slice(0, 10),
    category: catMatch?.[1]?.trim() || 'Engineering',
    decision: decMatch?.[1]?.trim() || '',
    summary: extractSummary(raw),
    humanReview: reviewMatch?.[1]?.trim() || 'autonomous',
    html: stripAndRender(raw),
  }
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

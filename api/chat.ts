/**
 * Vercel Serverless Function — POST /api/chat
 * Trending chatbot: repo recommendations grounded in the build-time report index.
 * LLM = ZAI GLM (OpenAI-compatible). Key lives in Vercel env, never in the bundle.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import index from '../public/trending-index.json'

interface Report {
  slug: string
  date: string
  title: string
  summary: string
  repos: { repo: string; stars_today: number; lang: string; desc: string; rank: number }[]
  insights: { repo: string; note: string }[]
}

const REPORTS = index as Report[]
const RATE_LIMIT = 10
const WINDOW_MS = 60_000
const MAX_HISTORY = 6

const hits = new Map<string, number[]>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const arr = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS)
  arr.push(now)
  hits.set(ip, arr)
  if (hits.size > 5000) hits.clear() // ponytail: crude GC, per-IP map fine for a personal site
  return arr.length > RATE_LIMIT
}

function pickReports(question: string): Report[] {
  const q = question.toLowerCase()
  const scored = REPORTS.map(r => {
    let score = 0
    for (const repo of r.repos) {
      const name = repo.repo.toLowerCase()
      if (q.includes(name) || name.split('/').some(part => part.length > 3 && q.includes(part))) score += 5
      const lang = repo.lang.toLowerCase()
      if (lang.length > 2 && q.includes(lang)) score += 2
    }
    for (const kw of (r.summary + ' ' + r.title).toLowerCase().split(/\W+/)) {
      if (kw.length > 4 && q.includes(kw)) score += 1
    }
    return { r, score }
  })
  // top matches, plus the 3 most recent reports as always-present context
  const top = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 6).map(s => s.r)
  const recent = [...REPORTS].slice(-3)
  const seen = new Set(top.map(r => r.slug))
  return [...top, ...recent.filter(r => !seen.has(r.slug))]
}

function buildContext(reports: Report[]): string {
  return reports.map(r => {
    const repos = r.repos.slice(0, 5).map(p => `- ${p.repo} (+${p.stars_today} hari ini, ${p.lang}): ${p.desc}`).join('\n')
    const insights = r.insights.map(i => `- ${i.repo}: ${i.note}`).join('\n')
    return `## ${r.title} (laporan /trending/${r.slug})\nRingkasan: ${r.summary}\nRepo:\n${repos}\n${insights ? `Insight:\n${insights}` : ''}`
  }).join('\n\n')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const ip = String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown').split(',')[0].trim()
  if (rateLimited(ip)) return res.status(429).json({ error: 'Terlalu banyak pertanyaan — coba lagi sebentar.' })

  const question = typeof req.body?.question === 'string' ? req.body.question.trim().slice(0, 500) : ''
  if (!question) return res.status(400).json({ error: 'question wajib' })
  const history = Array.isArray(req.body?.history) ? req.body.history.slice(-MAX_HISTORY) : []

  const apiKey = process.env.GLM_API_KEY
  const baseUrl = (process.env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4').replace(/\/$/, '')
  if (!apiKey) return res.status(502).json({ error: 'LLM belum dikonfigurasi' })

  const reports = pickReports(question)
  const context = buildContext(reports)
  const sources = reports.map(r => ({ slug: r.slug, title: r.title }))

  const messages = [
    {
      role: 'system',
      content:
        'Kamu asisten rekomendasi repo di halaman GitHub Trending milik TabacoID. ' +
        'Jawab HANYA berdasarkan konteks laporan yang diberikan. ' +
        'Bentuk jawaban: 1 paragraf singkat rekomendasi (sebut nama repo, alasan, dan tanggal laporan bila relevan), ' +
        'lalu maksimal 5 repo sebagai bullet. Jawab dalam bahasa pertanyaan user. ' +
        'Kalau konteks tidak memadai untuk menjawab, katakan jujur dan sarankan baca arsip /trending. ' +
        'Jangan mengaruh repo yang tidak ada di konteks.\n\nKONTEKS LAPORAN:\n' + context,
    },
    ...history.map((h: { role: string; content: string }) => ({ role: h.role, content: String(h.content).slice(0, 2000) })),
    { role: 'user', content: question },
  ]

  try {
    const r = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: process.env.GLM_MODEL || 'glm-4.6-flash', messages, max_tokens: 600, temperature: 0.4 }),
    })
    if (!r.ok) {
      const body = await r.text()
      console.error('LLM error', r.status, body.slice(0, 300))
      return res.status(502).json({ error: 'LLM gagal merespons' })
    }
    const data = await r.json()
    const answer = data?.choices?.[0]?.message?.content
    if (!answer) return res.status(502).json({ error: 'LLM respons kosong' })
    return res.status(200).json({ answer, sources })
  } catch (e: unknown) {
    console.error('chat handler', e)
    return res.status(502).json({ error: 'LLM gagal merespons' })
  }
}

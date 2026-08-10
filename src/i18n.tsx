import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Lang = 'en' | 'id'

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: string) => string }

const LanguageContext = createContext<Ctx | null>(null)

// ponytail: flat key→translation map per language. Values are strings or functions for interpolation.
const T = {
  en: {
    // Nav
    'nav.home': 'Home',
    'nav.reports': 'Reports',
    'nav.workflow': 'Workflow',
    'nav.about': 'About',
    // Hero
    'hero.eyebrow': 'Autonomous AI engineering laboratory',
    'hero.title': 'What happens when an AI agent does real software engineering — on its own.',
    'hero.subtitle': 'An AI named Hermes fixes real bugs, runs real experiments, and maintains real servers. No demos, no toy projects. This site documents everything — every decision, every failure, every result.',
    'hero.cta.reports': 'Read the reports',
    'hero.cta.about': 'About the lab',
    // Stats
    'stat.days.label': 'Days running',
    'stat.days.detail': (n: number, r: number | string) => `${n} tasks completed, ${r} reports published.`,
    'stat.objectives.label': 'Objectives',
    'stat.objectives.detail': 'Each task links to an objective via the Kanban control plane.',
    'stat.model.label': 'Operating model',
    'stat.model.value': 'Autonomous + human review',
    'stat.model.detail': 'Hermes executes one task per cycle. Human approves every push.',
    // Operating cycle card
    'cycle.eyebrow': 'Operating cycle',
    'cycle.title': 'Plan → execute → review → retrospect.',
    'cycle.desc': 'Four separate cron jobs. One task per cycle. Never multiple unrelated objectives at once.',
    // Capabilities
    'cap.eyebrow': 'Capabilities',
    'cap.title': 'What the laboratory actually does.',
    'cap.desc': 'Hermes operates as a platform engineer: research, implementation, documentation, and experiments — producing measurable engineering value.',
    // Experiments
    'exp.eyebrow': 'Experiments',
    'exp.title': 'Engineering experiments with hypotheses, metrics, and published results.',
    'exp.desc': 'No experiment is complete without measurable evidence. Each ends with: adopt, reject, or needs human review.',
    'exp.hypothesis': 'Hypothesis',
    'exp.outcome': 'Outcome',
    'exp.readReport': 'Read full report →',
    // Operating cycle section
    'proc.eyebrow': 'Operating cycle',
    'proc.title': 'How Hermes works each cycle.',
    'proc.desc': 'A disciplined loop: review, research, implement, document, report. Never multiple unrelated objectives in a single cycle.',
    // About page
    'about.eyebrow': 'About',
    'about.title': 'Not a portfolio. An engineering lab where AI does the work.',
    'about.subtitle': 'TabacoID documents Hermes — an AI agent that does platform engineering autonomously. The website is the transparent window into its work.',
    'about.cta.vision': 'Read the vision doc',
    'about.cta.reports': 'Read the reports',
    // Thesis
    'thesis.eyebrow': 'The thesis',
    'thesis.title': 'The website is not the product. Hermes is the product.',
    'thesis.desc': 'This site exists to show whether an AI agent can continuously operate as a platform engineer and produce measurable value — not just write code, but run a real engineering operation.',
    'thesis.metric.label': 'Success metric',
    'thesis.metric.value': 'Measurable engineering outcomes — not commits, file counts, or the appearance of productivity.',
    // Systems
    'sys.eyebrow': 'Systems',
    'sys.title': 'Seven systems under Hermes engineering.',
    'sys.desc': 'Hermes operates across the full stack — from hardware to application. Each system is maintained, monitored, and improved through the engineering cycle.',
    // Objectives
    'obj.eyebrow': 'Objectives',
    'obj.title': 'Five mission-level objectives tracked on the Kanban board.',
    'obj.desc': 'Every task links to one of these objectives. Progress is measured by completed engineering outcomes, not activity.',
    'obj.metric': 'Metric',
    // Principles
    'prin.eyebrow': 'Principles',
    'prin.title': 'The philosophy is intentionally restrained.',
    'prin.desc': 'Prefer simplicity, reliability, automation, documentation. Avoid feature bloat, premature optimization, unnecessary frameworks, and AI-generated busywork.',
    // Source
    'src.eyebrow': 'Open source',
    'src.title': 'Every report, every experiment, every failure — public on GitHub.',
    'src.cta': 'View the repository',
    // Reports page
    'rep.eyebrow': 'Engineering Reports',
    'rep.title': 'Daily engineering reports with measurable evidence.',
    'rep.desc': 'Every cycle produces a report: question, method, findings, decision, and metrics. No busywork — only real engineering work.',
    'rep.loading': 'Loading reports...',
    'rep.count': (n: number, total: number) => `${n} of ${total} reports from docs/reports/`,
    'rep.prev': '← Previous',
    'rep.next': 'Next →',
    'rep.page': (p: number, tp: number) => `Page ${p} of ${tp}`,
    // Report detail
    'rd.back': 'All reports',
    'rd.loading': 'Loading...',
    // 404
    'nf.eyebrow': '404',
    'nf.title': 'This page does not exist.',
    'nf.desc': 'The route may have changed as part of the new TabacoID site structure.',
    'nf.cta': 'Back to home',
    // Footer
    'footer.tagline': 'An autonomous AI engineering laboratory.',
    'footer.desc': 'The transparent interface into Hermes\' engineering activities: experiments, architecture, daily reports, and measurable outcomes.',
    'footer.readReports': 'Read the reports',
    'footer.pages': 'Pages',
    'footer.contact': 'Contact',
    'footer.contactDesc': 'Questions about the project or collaboration.',
    'footer.copyright': (y: number, b: string) => `© ${y} ${b}. All rights reserved.`,
    // SEO
    'seo.home.desc': 'A lab where an AI agent named Hermes does real software engineering — fixing bugs, running experiments, maintaining servers. Fully documented, fully public.',
    'seo.reports.desc': 'Daily engineering reports with measurable evidence: question, method, findings, decision, and metrics from autonomous AI cycles.',
    'seo.about.desc': 'TabacoID is not a portfolio but an engineering laboratory. Seven systems, five objectives, transparent autonomous AI engineering.',
    // Workflow page
    'wf.eyebrow': 'Engineering cycle',
    'wf.title': 'How the whole thing works.',
    'wf.subtitle': 'Four cron jobs, one Kanban board, one AI agent. This is the v0.4 architecture that runs every engineering cycle.',
    'wf.cycle.eyebrow': 'The cycle',
    'wf.cycle.title': 'Four phases, one task per cycle.',
    'wf.cycle.desc': 'Each phase is a separate scheduled job. The Kanban board is the control plane — tasks flow through it, never bypass it.',
    'wf.sys.eyebrow': 'Systems',
    'wf.sys.title': 'Seven systems, all under Hermes engineering.',
    'wf.sys.desc': 'The agent maintains everything from the host OS to this website. Each system is real, running in production.',
    'wf.flow.eyebrow': 'Task lifecycle',
    'wf.flow.title': 'From ready to done — or blocked.',
    'wf.flow.desc': 'Every task starts as "ready" on the Kanban board. The executor claims it, does the work, and produces a report. If it needs human input, it gets blocked.',
    'wf.s.ready': 'Ready',
    'wf.s.claim': 'Claim',
    'wf.s.execute': 'Execute',
    'wf.s.execute.sub': '1 task / cycle',
    'wf.s.measure': 'Measure',
    'wf.s.measure.sub': '≥1 metric',
    'wf.s.report': 'Draft Report',
    'wf.s.report.sub': 'docs/reports/draft/',
    'wf.s.done': 'Done',
    'wf.s.blocked': 'Blocked',
    'wf.s.blocked.sub': 'needs human',
  },
  id: {
    // Nav
    'nav.home': 'Beranda',
    'nav.reports': 'Laporan',
    'nav.workflow': 'Workflow',
    'nav.about': 'Tentang',
    // Hero
    'hero.eyebrow': 'Lab engineering AI otonom',
    'hero.title': 'Apa yang terjadi saat AI melakukan engineering software sungguhan — tanpa campur tangan manusia.',
    'hero.subtitle': 'Sebuah AI bernama Hermes memperbaiki bug asli, menjalankan eksperimen nyata, dan merawat server sungguhan. Bukan demo, bukan mainan. Situs ini mendokumentasikan semuanya — setiap keputusan, setiap kegagalan, setiap hasil.',
    'hero.cta.reports': 'Baca laporan',
    'hero.cta.about': 'Tentang lab',
    // Stats
    'stat.days.label': 'Hari berjalan',
    'stat.days.detail': (n: number, r: number | string) => `${n} task selesai, ${r} laporan dipublikasi.`,
    'stat.objectives.label': 'Objektif',
    'stat.objectives.detail': 'Setiap task terhubung ke objektif melalui Kanban control plane.',
    'stat.model.label': 'Model operasi',
    'stat.model.value': 'Otonom + review manusia',
    'stat.model.detail': 'Hermes mengerjakan satu task per cycle. Manusia approve setiap push.',
    // Operating cycle card
    'cycle.eyebrow': 'Siklus operasi',
    'cycle.title': 'Plan → execute → review → retrospect.',
    'cycle.desc': 'Empat cron job terpisah. Satu task per cycle. Tidak pernah beberapa objektif sekaligus.',
    // Capabilities
    'cap.eyebrow': 'Kapabilitas',
    'cap.title': 'Apa yang sebenarnya dikerjakan lab ini.',
    'cap.desc': 'Hermes bekerja sebagai platform engineer: riset, implementasi, dokumentasi, dan eksperimen — menghasilkan engineering value yang terukur.',
    // Experiments
    'exp.eyebrow': 'Eksperimen',
    'exp.title': 'Eksperimen engineering dengan hipotesis, metrik, dan hasil yang dipublikasi.',
    'exp.desc': 'Tidak ada eksperimen tanpa evidence terukur. Setiap eksperimen berakhir dengan: adopt, reject, atau needs human review.',
    'exp.hypothesis': 'Hipotesis',
    'exp.outcome': 'Hasil',
    'exp.readReport': 'Baca laporan lengkap →',
    // Operating cycle section
    'proc.eyebrow': 'Siklus operasi',
    'proc.title': 'Bagaimana Hermes bekerja setiap cycle.',
    'proc.desc': 'Loop yang disiplin: review, riset, implementasi, dokumentasi, laporan. Tidak pernah beberapa objektif dalam satu cycle.',
    // About page
    'about.eyebrow': 'Tentang',
    'about.title': 'Bukan portofolio. Lab engineering tempat AI yang mengerjakan semuanya.',
    'about.subtitle': 'TabacoID mendokumentasikan Hermes — AI agent yang melakukan platform engineering secara otonom. Situs ini adalah jendela transparan ke dalam kerjanya.',
    'about.cta.vision': 'Baca dokumen vision',
    'about.cta.reports': 'Baca laporan',
    // Thesis
    'thesis.eyebrow': 'Tesis',
    'thesis.title': 'Website bukan produk. Hermes adalah produk.',
    'thesis.desc': 'Situs ini ada untuk menunjukkan apakah AI agent bisa terus-menerus bekerja sebagai platform engineer dan menghasilkan value terukur — bukan sekadar menulis kode, tapi menjalankan operasi engineering nyata.',
    'thesis.metric.label': 'Metrik sukses',
    'thesis.metric.value': 'Engineering outcomes yang terukur — bukan jumlah commit, file, atau kesan produktif.',
    // Systems
    'sys.eyebrow': 'Sistem',
    'sys.title': 'Tujuh sistem under engineering Hermes.',
    'sys.desc': 'Hermes bekerja across the full stack — dari hardware sampai aplikasi. Setiap sistem di-maintain, di-monitor, dan ditingkatkan melalui engineering cycle.',
    // Objectives
    'obj.eyebrow': 'Objektif',
    'obj.title': 'Lima objektif level misi di Kanban board.',
    'obj.desc': 'Setiap task terhubung ke salah satu objektif ini. Progress diukur dari engineering outcomes yang selesai, bukan aktivitas.',
    'obj.metric': 'Metrik',
    // Principles
    'prin.eyebrow': 'Prinsip',
    'prin.title': 'Filosofinya sengaja dibuat simpel.',
    'prin.desc': 'Utamakan kesederhanaan, reliability, automation, dokumentasi. Hindari feature bloat, premature optimization, framework yang tidak perlu, dan busywork buatan AI.',
    // Source
    'src.eyebrow': 'Open source',
    'src.title': 'Setiap laporan, setiap eksperimen, setiap kegagalan — publik di GitHub.',
    'src.cta': 'Lihat repository',
    // Reports page
    'rep.eyebrow': 'Laporan Engineering',
    'rep.title': 'Laporan engineering harian dengan evidence terukur.',
    'rep.desc': 'Setiap cycle menghasilkan laporan: pertanyaan, metode, temuan, keputusan, dan metrik. Hanya engineering sungguhan yang didokumentasikan di sini.',
    'rep.loading': 'Memuat laporan...',
    'rep.count': (n: number, total: number) => `${n} dari ${total} laporan dari docs/reports/`,
    'rep.prev': '← Sebelumnya',
    'rep.next': 'Berikutnya →',
    'rep.page': (p: number, tp: number) => `Halaman ${p} dari ${tp}`,
    // Report detail
    'rd.back': 'Semua laporan',
    'rd.loading': 'Memuat...',
    // 404
    'nf.eyebrow': '404',
    'nf.title': 'Halaman ini tidak ada.',
    'nf.desc': 'URL mungkin berubah sebagai bagian dari struktur situs TabacoID yang baru.',
    'nf.cta': 'Kembali ke beranda',
    // Footer
    'footer.tagline': 'Lab engineering AI otonom.',
    'footer.desc': 'Antarmuka transparan ke aktivitas engineering Hermes: eksperimen, arsitektur, laporan harian, dan outcomes yang terukur.',
    'footer.readReports': 'Baca laporan',
    'footer.pages': 'Halaman',
    'footer.contact': 'Kontak',
    'footer.contactDesc': 'Pertanyaan tentang project atau kolaborasi.',
    'footer.copyright': (y: number, b: string) => `© ${y} ${b}. Hak cipta dilindungi.`,
    // SEO
    'seo.home.desc': 'Lab tempat AI agent bernama Hermes melakukan engineering software sungguhan — memperbaiki bug, menjalankan eksperimen, merawat server. Terdokumentasi penuh, publik.',
    'seo.reports.desc': 'Laporan engineering harian dengan evidence terukur: pertanyaan, metode, temuan, keputusan, dan metrik dari cycle AI otonom.',
    'seo.about.desc': 'TabacoID bukan portofolio tapi lab engineering. Tujuh sistem, lima objektif, engineering AI otonom yang transparan.',
    // Workflow page
    'wf.eyebrow': 'Siklus engineering',
    'wf.title': 'Bagaimana semuanya bekerja.',
    'wf.subtitle': 'Empat cron job, satu Kanban board, satu AI agent. Ini arsitektur v0.4 yang menjalankan setiap siklus engineering.',
    'wf.cycle.eyebrow': 'Siklus',
    'wf.cycle.title': 'Empat fase, satu task per siklus.',
    'wf.cycle.desc': 'Setiap fase adalah scheduled job terpisah. Kanban board adalah control plane — task mengalir melaluinya, tidak pernah bypass.',
    'wf.sys.eyebrow': 'Sistem',
    'wf.sys.title': 'Tujuh sistem, semua under engineering Hermes.',
    'wf.sys.desc': 'AI agent merawat semuanya, dari host OS sampai website ini. Setiap sistem nyata, running di production.',
    'wf.flow.eyebrow': 'Task lifecycle',
    'wf.flow.title': 'Dari ready sampai done — atau blocked.',
    'wf.flow.desc': 'Setiap task mulai sebagai "ready" di Kanban board. Executor claim task, kerjakan, buat laporan. Kalau butuh input manusia, di-block.',
    'wf.s.ready': 'Ready',
    'wf.s.claim': 'Claim',
    'wf.s.execute': 'Eksekusi',
    'wf.s.execute.sub': '1 task / siklus',
    'wf.s.measure': 'Ukur',
    'wf.s.measure.sub': '≥1 metrik',
    'wf.s.report': 'Draft Laporan',
    'wf.s.report.sub': 'docs/reports/draft/',
    'wf.s.done': 'Done',
    'wf.s.blocked': 'Blocked',
    'wf.s.blocked.sub': 'butuh manusia',
  },
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem('tabacoid-lang')
    return saved === 'id' ? 'id' : 'en'
  })

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem('tabacoid-lang', l)
  }

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const t = (key: string): string => {
    const val = T[lang][key]
    if (typeof val === 'function') return '' // function-type translations accessed via useT()
    return val ?? key
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLang() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLang must be used within LanguageProvider')
  return ctx
}

// Direct access for components that need function-type translations
export function useT() {
  const { lang } = useLang()
  return T[lang]
}

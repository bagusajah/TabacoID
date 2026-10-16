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
    'nav.trending': 'Trending',
    'nav.ambience': 'Ambience',
    'nav.workflow': 'Workflow',
    'nav.about': 'About',
    'nav.menu.open': 'Open navigation menu',
    'nav.menu.close': 'Close navigation menu',
    // Trending page
    'tr.eyebrow': 'Trending watchtower',
    'tr.title': 'What the wider AI-engineering world is shipping.',
    'tr.desc': 'Daily digests from a companion research agent: trending GitHub repositories in AI and code. Monthly archives and a visual dashboard are built from the same collection. Published as-is, with source links.',
    'tr.daily': 'Daily digest',
    'tr.monthlySection': 'Monthly archives',
    'tr.loading': 'Loading digest...',
    'tr.error': 'Could not load the digests. Check your connection and try again.',
    'tr.retry': 'Try again',
    'tr.empty': 'No digests published yet.',
    'tr.dashboard': 'Visual dashboard',
    'tr.count': (n: number) => `${n} digests published.`,
    'am.eyebrow': 'Ambience videos',
    'am.title': 'Ambient scenes, generated and published daily.',
    'am.desc': 'A growing catalog of AI-produced ambience videos — rain, cafés, nature — published by an autonomous production agent. Watch inline or on YouTube.',
    'am.loading': 'Loading videos...',
    'am.empty': 'No videos published yet.',
    'am.watch': 'Watch on YouTube',
    'am.count': (n: number) => `${n} video${n === 1 ? '' : 's'} published.`,
    'am.play': (title: string) => `Play ${title}`,
    'am.close': 'Close player',
    'am.external': 'opens in a new tab',
    'am.full': 'Full 8-hour version',
    // Hero
    'hero.eyebrow': 'Autonomous AI engineering laboratory',
    'hero.title': 'What happens when an AI agent does real software engineering — on its own.',
    'hero.subtitle': 'An AI named Hermes fixes real bugs, runs real experiments, and maintains real servers. No demos, no toy projects. This site documents everything — every decision, every failure, every result.',
    'hero.cta.reports': 'Read the reports',
    'hero.cta.about': 'About the lab',
    'hero.lastCycle': (date: string) => `Last cycle: ${date}`,
    'hero.running': 'fresh',
    // Stats
    'stat.days.label': 'Days running',
    'stat.days.value': (n: number) => `Day ${n}`,
    'stat.days.detail': (n: number, r: number | string) => `${r} of ${n} reports published.`,
    'stat.objectives.label': 'Objectives',
    'stat.objectives.detail': 'Five standing objectives guiding task selection in every cycle.',
    'stat.model.label': 'Operating model',
    'stat.model.value': 'Autonomous + human review',
    'stat.model.detail': 'Hermes executes one task per cycle. Every push is published and reviewable.',
    // Operating cycle card
    'cycle.eyebrow': 'Operating cycle',
    'cycle.title': 'Execute → publish → review.',
    'cycle.desc': 'Three separate cron jobs. One task per cycle. Never multiple unrelated objectives at once.',
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
    'about.subtitle': 'TabacoID documents Hermes — an AI agent that does platform engineering autonomously. The website is the transparent window into its work. Operated by TABACO DIGITAL TECHNOLOGY.',
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
    'sys.title': 'Eight systems under Hermes engineering.',
    'sys.desc': 'Hermes operates across the full stack — from hardware to application. Each system is maintained, monitored, and improved through the engineering cycle.',
    // Objectives
    'obj.eyebrow': 'Objectives',
    'obj.title': 'Five mission-level objectives.',
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
    'rep.pagination': 'Pagination',
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
    'footer.dashboard': 'Trending dashboard',
    // SEO
    'seo.home.desc': 'A lab where an AI agent named Hermes does real software engineering — fixing bugs, running experiments, maintaining servers. Fully documented, fully public.',
    'seo.reports.desc': 'Daily engineering reports with measurable evidence: question, method, findings, decision, and metrics from autonomous AI cycles.',
    'seo.about.desc': 'TabacoID is not a portfolio but an engineering laboratory. Eight systems, five objectives, transparent autonomous AI engineering.',
    'seo.workflow': 'Three cron jobs, one ROADMAP backlog: the weekend engineering cycle that drives every task Hermes executes.',
    'seo.404': 'Page not found',
    'seo.404.desc': 'This page does not exist on TabacoID.',
    // Trending dashboard
    'td.eyebrow': 'Dashboard',
    'td.title': 'GitHub Trending 2026 — visual',
    'td.desc': 'Language mix, repository lifespan, era shifts, consistency, and organization strength — built from the daily collector archive.',
    'td.loading': 'Loading dashboard…',
    'td.error': 'Could not load the dashboard. Check your connection and try again.',
    'td.retry': 'Try again',
    'td.iframe': 'GitHub Trending 2026 dashboard',
    'td.back': 'Back to trending reports',
    'td.seoTitle': 'Trending dashboard',
    'td.seoDesc': 'Visual archive of GitHub Trending 2026: languages, eras, consistency, and organizations.',
    // Workflow page
    'wf.eyebrow': 'Engineering cycle',
    'wf.title': 'How the whole thing works.',
    'wf.subtitle': 'Three cron jobs, one ROADMAP backlog, one AI agent. Weekend engineering cycles with published evidence.',
    'wf.cycle.eyebrow': 'The cycle',
    'wf.cycle.title': 'Three jobs, one task per cycle.',
    'wf.cycle.desc': 'Each job is a separate cron, driven by the ROADMAP backlog in priority order. The earlier v0.4 pipeline (planner/reviewer/retrospective with its Kanban control plane) is paused.',
    'wf.sys.eyebrow': 'Systems',
    'wf.sys.title': 'Eight systems, all under Hermes engineering.',
    'wf.sys.desc': 'The agent maintains everything from the host OS to this website. Each system is real, running in production.',
    'wf.flow.eyebrow': 'Task lifecycle',
    'wf.flow.title': 'From backlog to published — or blocked.',
    'wf.flow.desc': 'Each cycle picks the highest-value item from the ROADMAP backlog, executes it with measurable evidence, and auto-publishes the report. If it needs human input, it gets blocked.',
    'wf.s.ready': 'Pick',
    'wf.s.ready.sub': 'ROADMAP / backlog',
    'wf.s.execute': 'Execute',
    'wf.s.execute.sub': '1 task / cycle',
    'wf.s.measure': 'Measure',
    'wf.s.measure.sub': '≥1 metric',
    'wf.s.report': 'Report',
    'wf.s.report.sub': 'docs/reports/',
    'wf.s.done': 'Published',
    'wf.s.done.sub': 'auto-push to main',
    'wf.s.blocked': 'Blocked',
    'wf.s.blocked.sub': 'needs human',
  },
  id: {
    // Nav
    'nav.home': 'Beranda',
    'nav.reports': 'Laporan',
    'nav.trending': 'Trending',
    'nav.ambience': 'Ambience',
    'nav.workflow': 'Workflow',
    'nav.about': 'Tentang',
    'nav.menu.open': 'Buka menu navigasi',
    'nav.menu.close': 'Tutup menu navigasi',
    // Trending page
    'tr.eyebrow': 'Trending radar',
    'tr.title': 'Apa yang dunia AI-engineering rilis.',
    'tr.desc': 'Digest harian dari agent riset pendamping: repositori GitHub yang sedang trending di bidang AI dan kode. Arsip bulanan dan dashboard visual dibangun dari koleksi yang sama. Dipublikasi apa adanya, dengan tautan sumber.',
    'tr.daily': 'Digest harian',
    'tr.monthlySection': 'Arsip bulanan',
    'tr.loading': 'Memuat digest...',
    'tr.error': 'Gagal memuat digest. Periksa koneksi kamu lalu coba lagi.',
    'tr.retry': 'Coba lagi',
    'tr.empty': 'Belum ada digest yang dipublikasikan.',
    'tr.dashboard': 'Dashboard visual',
    'tr.count': (n: number) => `${n} digest terpublikasi.`,
    'am.eyebrow': 'Video ambience',
    'am.title': 'Suasana ambient, diproduksi dan terbit tiap hari.',
    'am.desc': 'Katalog video ambience buatan AI — hujan, kafe, alam — diterbitkan oleh agent produksi otonom. Tonton di sini atau di YouTube.',
    'am.loading': 'Memuat video...',
    'am.empty': 'Belum ada video yang dipublikasikan.',
    'am.watch': 'Tonton di YouTube',
    'am.count': (n: number) => `${n} video terpublikasi.`,
    'am.play': (title: string) => `Putar ${title}`,
    'am.close': 'Tutup pemutar',
    'am.external': 'buka di tab baru',
    'am.full': 'Versi lengkap 8 jam',
    // Hero
    'hero.eyebrow': 'Lab engineering AI otonom',
    'hero.title': 'Apa yang terjadi saat AI melakukan engineering software sungguhan — tanpa campur tangan manusia.',
    'hero.subtitle': 'Sebuah AI bernama Hermes memperbaiki bug asli, menjalankan eksperimen nyata, dan merawat server sungguhan. Bukan demo, bukan mainan. Situs ini mendokumentasikan semuanya — setiap keputusan, setiap kegagalan, setiap hasil.',
    'hero.cta.reports': 'Baca laporan',
    'hero.cta.about': 'Tentang lab',
    'hero.lastCycle': (date: string) => `Siklus terakhir: ${date}`,
    'hero.running': 'segar',
    // Stats
    'stat.days.label': 'Hari berjalan',
    'stat.days.value': (n: number) => `Hari ke-${n}`,
    'stat.days.detail': (n: number, r: number | string) => `${r} dari ${n} laporan dipublikasi.`,
    'stat.objectives.label': 'Objektif',
    'stat.objectives.detail': 'Lima objektif tetap yang memandu pemilihan task di setiap siklus.',
    'stat.model.label': 'Model operasi',
    'stat.model.value': 'Otonom + review manusia',
    'stat.model.detail': 'Hermes mengerjakan satu task per cycle. Setiap push dipublikasi dan bisa direview.',
    // Operating cycle card
    'cycle.eyebrow': 'Siklus operasi',
    'cycle.title': 'Execute → publish → review.',
    'cycle.desc': 'Tiga cron job terpisah. Satu task per cycle. Tidak pernah beberapa objektif sekaligus.',
    // Capabilities
    'cap.eyebrow': 'Kapabilitas',
    'cap.title': 'Apa yang sebenarnya dikerjakan lab ini.',
    'cap.desc': 'Hermes bekerja sebagai platform engineer: riset, implementasi, dokumentasi, dan eksperimen — menghasilkan engineering value yang terukur.',
    // Experiments
    'exp.eyebrow': 'Eksperimen',
    'exp.title': 'Eksperimen engineering dengan hipotesis, metrik, dan hasil yang dipublikasi.',
    'exp.desc': 'Tidak ada eksperimen tanpa evidence terukur. Setiap eksperimen berakhir dengan: adopt, reject, atau perlu tinjauan manusia.',
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
    'about.subtitle': 'TabacoID mendokumentasikan Hermes — AI agent yang melakukan platform engineering secara otonom. Situs ini adalah jendela transparan ke dalam kerjanya. Dikelola oleh TABACO DIGITAL TECHNOLOGY.',
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
    'sys.title': 'Delapan sistem yang direkayasa Hermes.',
    'sys.desc': 'Hermes bekerja across the full stack — dari hardware sampai aplikasi. Setiap sistem di-maintain, di-monitor, dan ditingkatkan melalui engineering cycle.',
    // Objectives
    'obj.eyebrow': 'Objektif',
    'obj.title': 'Lima objektif level misi.',
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
    'rep.pagination': 'Paginasi',
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
    'footer.dashboard': 'Dashboard trending',
    // SEO
    'seo.home.desc': 'Lab tempat AI agent bernama Hermes melakukan engineering software sungguhan — memperbaiki bug, menjalankan eksperimen, merawat server. Terdokumentasi penuh, publik.',
    'seo.reports.desc': 'Laporan engineering harian dengan evidence terukur: pertanyaan, metode, temuan, keputusan, dan metrik dari cycle AI otonom.',
    'seo.about.desc': 'TabacoID bukan portofolio tapi lab engineering. Delapan sistem, lima objektif, engineering AI otonom yang transparan.',
    'seo.workflow': 'Tiga cron job, satu backlog ROADMAP: siklus engineering akhir pekan yang menjalankan setiap task Hermes.',
    'seo.404': 'Halaman tidak ditemukan',
    'seo.404.desc': 'Halaman ini tidak ada di TabacoID.',
    // Trending dashboard
    'td.eyebrow': 'Dashboard',
    'td.title': 'GitHub Trending 2026 — visual',
    'td.desc': 'Komposisi bahasa, siklus hidup repo, pergeseran era, konsistensi, dan kekuatan organisasi — dibangun dari arsip kolektor harian.',
    'td.loading': 'Memuat dashboard…',
    'td.error': 'Gagal memuat dashboard. Periksa koneksi kamu lalu coba lagi.',
    'td.retry': 'Coba lagi',
    'td.iframe': 'Dashboard GitHub Trending 2026',
    'td.back': 'Kembali ke laporan trending',
    'td.seoTitle': 'Dashboard trending',
    'td.seoDesc': 'Visualisasi arsip GitHub Trending 2026: bahasa, era, konsistensi, dan organisasi.',
    // Workflow page
    'wf.eyebrow': 'Siklus engineering',
    'wf.title': 'Bagaimana semuanya bekerja.',
    'wf.subtitle': 'Tiga cron job, satu backlog ROADMAP, satu AI agent. Siklus engineering akhir pekan dengan bukti terpublikasi.',
    'wf.cycle.eyebrow': 'Siklus',
    'wf.cycle.title': 'Tiga job, satu task per siklus.',
    'wf.cycle.desc': 'Setiap job adalah cron terpisah, digerakkan oleh backlog ROADMAP sesuai prioritas. Pipeline v0.4 sebelumnya (planner/reviewer/retrospective dengan Kanban control plane) sedang dijeda.',
    'wf.sys.eyebrow': 'Sistem',
    'wf.sys.title': 'Delapan sistem, semuanya di bawah engineering Hermes.',
    'wf.sys.desc': 'AI agent merawat semuanya, dari host OS sampai website ini. Setiap sistem nyata, running di production.',
    'wf.flow.eyebrow': 'Task lifecycle',
    'wf.flow.title': 'Dari backlog sampai terbit — atau blocked.',
    'wf.flow.desc': 'Setiap siklus memilih item bernilai tertinggi dari backlog ROADMAP, mengerjakannya dengan bukti terukur, lalu auto-publish laporannya. Kalau butuh input manusia, di-block.',
    'wf.s.ready': 'Pilih',
    'wf.s.ready.sub': 'ROADMAP / backlog',
    'wf.s.execute': 'Eksekusi',
    'wf.s.execute.sub': '1 task / siklus',
    'wf.s.measure': 'Ukur',
    'wf.s.measure.sub': '≥1 metrik',
    'wf.s.report': 'Laporan',
    'wf.s.report.sub': 'docs/reports/',
    'wf.s.done': 'Terbit',
    'wf.s.done.sub': 'auto-push ke main',
    'wf.s.blocked': 'Blocked',
    'wf.s.blocked.sub': 'butuh manusia',
  },
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem('tabacoid-lang')
      return saved === 'id' ? 'id' : 'en'
    } catch {
      return 'en'
    }
  })

  const setLang = (l: Lang) => {
    setLangState(l)
    try {
      localStorage.setItem('tabacoid-lang', l)
    } catch {
      // Private mode can throw on storage access.
    }
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

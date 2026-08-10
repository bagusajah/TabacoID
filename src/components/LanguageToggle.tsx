import { Globe } from 'lucide-react'
import { useLang, type Lang } from '@/i18n'

export default function LanguageToggle() {
  const { lang, setLang } = useLang()
  const next: Lang = lang === 'en' ? 'id' : 'en'

  return (
    <button
      onClick={() => setLang(next)}
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-soft)] bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-[var(--border-strong)]"
      aria-label={`Switch to ${next === 'id' ? 'Bahasa Indonesia' : 'English'}`}
    >
      <Globe className="h-3.5 w-3.5" />
      {lang === 'en' ? 'ID' : 'EN'}
    </button>
  )
}

import { createContext, useContext, useState, type ReactNode } from 'react'
import { translations, type Lang, type Translations } from '@/i18n/translations'

interface LanguageContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: Translations
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  setLang: () => {},
  t: translations.en,
})

function getInitialLang(): Lang {
  try {
    const stored = localStorage.getItem('rt_lang')
    if (stored === 'cs' || stored === 'en') return stored
    const browser = navigator.language.toLowerCase()
    if (browser.startsWith('cs') || browser.startsWith('sk')) return 'cs'
  } catch {
    // localStorage unavailable (SSR / private mode)
  }
  return 'en'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang)

  const setLang = (l: Lang) => {
    setLangState(l)
    try { localStorage.setItem('rt_lang', l) } catch { /* ignore */ }
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLang() {
  return useContext(LanguageContext)
}

import { useCallback, useEffect, useState } from 'react'

export type PageTheme = 'light' | 'dark'

const KEY = 'page-theme'
const query = '(prefers-color-scheme: dark)'

const stored = (): PageTheme | null => {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

/** The page's own light/dark appearance, not the Theme of the image. Follows the OS until the user toggles. */
export function usePageTheme(): [PageTheme, () => void] {
  const [explicit, setExplicit] = useState(stored)
  const [system, setSystem] = useState<PageTheme>(() => (matchMedia(query).matches ? 'dark' : 'light'))

  useEffect(() => {
    const mq = matchMedia(query)
    const on = () => setSystem(mq.matches ? 'dark' : 'light')
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  const theme = explicit ?? system

  const toggle = useCallback(() => {
    const next: PageTheme = theme === 'dark' ? 'light' : 'dark'
    setExplicit(next)
    document.documentElement.dataset.theme = next
    try { localStorage.setItem(KEY, next) } catch { /* private mode: the choice lasts for this visit */ }
  }, [theme])

  return [theme, toggle]
}

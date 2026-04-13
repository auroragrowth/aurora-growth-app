'use client'
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

const ThemeContext = createContext<{
  theme: Theme
  toggle: () => void
}>({ theme: 'dark', toggle: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const stored = localStorage.getItem('aurora-theme') as Theme
    const preferred = stored || 'dark'
    applyTheme(preferred)
    setTheme(preferred)
  }, [])

  const applyTheme = (t: Theme) => {
    const html = document.documentElement
    const body = document.body

    if (t === 'light') {
      html.classList.add('light')
      html.classList.remove('dark')
      body.style.backgroundColor = '#f0f4f8'
      body.style.color = '#0f172a'
    } else {
      html.classList.add('dark')
      html.classList.remove('light')
      body.style.backgroundColor = '#020c1b'
      body.style.color = '#e8f1ff'
    }
  }

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('aurora-theme', next)
    applyTheme(next)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)

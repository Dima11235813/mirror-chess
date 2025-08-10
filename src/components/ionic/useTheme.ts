import { useState, useEffect } from 'react'

interface UseThemeReturn {
  isDark: boolean
  toggleTheme: () => void
  setTheme: (isDark: boolean) => void
}

/**
 * Custom hook for managing theme state
 * Persists theme preference in localStorage
 * Applies theme to document body and Ionic
 */
export function useTheme(): UseThemeReturn {
  const [isDark, setIsDark] = useState<boolean>(() => {
    // Check localStorage first, then system preference
    const saved = localStorage.getItem('theme')
    if (saved !== null) {
      return saved === 'dark'
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  const setTheme = (dark: boolean) => {
    setIsDark(dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
    
    // Apply theme to document body
    document.body.classList.toggle('dark', dark)
    
    // Apply theme to Ionic
    if (dark) {
      document.body.classList.add('ion-theme-dark')
      document.body.classList.remove('ion-theme-light')
    } else {
      document.body.classList.add('ion-theme-light')
      document.body.classList.remove('ion-theme-dark')
    }
  }

  const toggleTheme = () => setTheme(!isDark)

  // Initialize theme on mount
  useEffect(() => {
    setTheme(isDark)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { isDark, toggleTheme, setTheme }
}

import { useState, useEffect, useCallback } from 'react'

export interface UseThemeReturn {
  isDark: boolean
  toggleTheme: () => void
  setTheme: (isDark: boolean) => void
}

/**
 * Custom hook for managing theme state
 * Persists theme preference in localStorage
 * Applies theme to document body and Ionic
 * Uses Ionic's recommended approach for theme switching
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

  const setTheme = useCallback((dark: boolean) => {
    setIsDark(dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
    
    // Apply theme to document body
    document.body.classList.toggle('dark', dark)
    
    // Apply Ionic theme classes (recommended approach)
    if (dark) {
      document.body.classList.add('ion-theme-dark')
      document.body.classList.remove('ion-theme-light')
    } else {
      document.body.classList.add('ion-theme-light')
      document.body.classList.remove('ion-theme-dark')
    }

    // Set comprehensive CSS custom properties for dynamic theming
    const root = document.documentElement
    
    if (dark) {
      // Dark theme colors
      root.style.setProperty('--ion-color-primary', '#428cff')
      root.style.setProperty('--ion-color-primary-rgb', '66, 140, 255')
      root.style.setProperty('--ion-color-primary-contrast', '#ffffff')
      root.style.setProperty('--ion-color-primary-contrast-rgb', '255, 255, 255')
      root.style.setProperty('--ion-color-primary-shade', '#3a7be0')
      root.style.setProperty('--ion-color-primary-tint', '#5598ff')
      
      // Dark theme background and text
      root.style.setProperty('--ion-background-color', '#000000')
      root.style.setProperty('--ion-background-color-rgb', '0, 0, 0')
      root.style.setProperty('--ion-text-color', '#ffffff')
      root.style.setProperty('--ion-text-color-rgb', '255, 255, 255')
      
      // Dark theme color steps
      root.style.setProperty('--ion-color-step-50', '#0d0d0d')
      root.style.setProperty('--ion-color-step-100', '#1a1a1a')
      root.style.setProperty('--ion-color-step-150', '#262626')
      root.style.setProperty('--ion-color-step-200', '#333333')
      root.style.setProperty('--ion-color-step-250', '#404040')
      root.style.setProperty('--ion-color-step-300', '#4d4d4d')
      root.style.setProperty('--ion-color-step-350', '#595959')
      root.style.setProperty('--ion-color-step-400', '#666666')
      root.style.setProperty('--ion-color-step-450', '#737373')
      root.style.setProperty('--ion-color-step-500', '#808080')
      root.style.setProperty('--ion-color-step-550', '#8c8c8c')
      root.style.setProperty('--ion-color-step-600', '#999999')
      root.style.setProperty('--ion-color-step-650', '#a6a6a6')
      root.style.setProperty('--ion-color-step-700', '#b3b3b3')
      root.style.setProperty('--ion-color-step-750', '#bfbfbf')
      root.style.setProperty('--ion-color-step-800', '#cccccc')
      root.style.setProperty('--ion-color-step-850', '#d9d9d9')
      root.style.setProperty('--ion-color-step-900', '#e6e6e6')
      root.style.setProperty('--ion-color-step-950', '#f2f2f2')
    } else {
      // Light theme colors
      root.style.setProperty('--ion-color-primary', '#3880ff')
      root.style.setProperty('--ion-color-primary-rgb', '56, 128, 255')
      root.style.setProperty('--ion-color-primary-contrast', '#ffffff')
      root.style.setProperty('--ion-color-primary-contrast-rgb', '255, 255, 255')
      root.style.setProperty('--ion-color-primary-shade', '#3171e0')
      root.style.setProperty('--ion-color-primary-tint', '#4c8dff')
      
      // Light theme background and text
      root.style.setProperty('--ion-background-color', '#ffffff')
      root.style.setProperty('--ion-background-color-rgb', '255, 255, 255')
      root.style.setProperty('--ion-text-color', '#000000')
      root.style.setProperty('--ion-text-color-rgb', '0, 0, 0')
      
      // Reset color steps to default light values
      root.style.setProperty('--ion-color-step-50', '#f2f2f2')
      root.style.setProperty('--ion-color-step-100', '#e6e6e6')
      root.style.setProperty('--ion-color-step-150', '#d9d9d9')
      root.style.setProperty('--ion-color-step-200', '#cccccc')
      root.style.setProperty('--ion-color-step-250', '#bfbfbf')
      root.style.setProperty('--ion-color-step-300', '#b3b3b3')
      root.style.setProperty('--ion-color-step-350', '#a6a6a6')
      root.style.setProperty('--ion-color-step-400', '#999999')
      root.style.setProperty('--ion-color-step-450', '#8c8c8c')
      root.style.setProperty('--ion-color-step-500', '#808080')
      root.style.setProperty('--ion-color-step-550', '#737373')
      root.style.setProperty('--ion-color-step-600', '#666666')
      root.style.setProperty('--ion-color-step-650', '#595959')
      root.style.setProperty('--ion-color-step-700', '#4d4d4d')
      root.style.setProperty('--ion-color-step-750', '#404040')
      root.style.setProperty('--ion-color-step-800', '#333333')
      root.style.setProperty('--ion-color-step-850', '#262626')
      root.style.setProperty('--ion-color-step-900', '#1a1a1a')
      root.style.setProperty('--ion-color-step-950', '#0d0d0d')
    }
  }, [])

  const toggleTheme = useCallback(() => setTheme(!isDark), [isDark, setTheme])

  // Initialize theme on mount and listen for system changes
  useEffect(() => {
    setTheme(isDark)
    
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't manually set a preference
      if (localStorage.getItem('theme') === null) {
        setTheme(e.matches)
      }
    }
    
    mediaQuery.addEventListener('change', handleChange)
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [setTheme])

  return { isDark, toggleTheme, setTheme }
}

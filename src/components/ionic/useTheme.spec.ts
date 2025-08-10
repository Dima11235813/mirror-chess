import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useTheme } from './useTheme'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock document.body.classList
const classListMock = {
  add: vi.fn(),
  remove: vi.fn(),
  toggle: vi.fn(),
}
Object.defineProperty(document.body, 'classList', {
  value: classListMock,
  writable: true,
})

describe('useTheme', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    ;(window.matchMedia as any).mockImplementation(() => ({
      matches: false,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

  afterEach(() => {
    // Clean up body classes
    document.body.classList.remove('dark', 'ion-theme-dark', 'ion-theme-light')
  })

  it('initializes with light theme when no preference is stored', () => {
    const { result } = renderHook(() => useTheme())
    
    expect(result.current.isDark).toBe(false)
    expect(localStorageMock.getItem).toHaveBeenCalledWith('theme')
  })

  it('initializes with dark theme when localStorage has dark preference', () => {
    localStorageMock.getItem.mockReturnValue('dark')
    
    const { result } = renderHook(() => useTheme())
    
    expect(result.current.isDark).toBe(true)
  })

  it('initializes with system preference when no localStorage value', () => {
    ;(window.matchMedia as any).mockImplementation(() => ({
      matches: true, // System prefers dark
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
    
    const { result } = renderHook(() => useTheme())
    
    expect(result.current.isDark).toBe(true)
  })

  it('toggles theme correctly', () => {
    const { result } = renderHook(() => useTheme())
    
    expect(result.current.isDark).toBe(false)
    
    act(() => {
      result.current.toggleTheme()
    })
    
    expect(result.current.isDark).toBe(true)
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark')
  })

  it('sets specific theme correctly', () => {
    const { result } = renderHook(() => useTheme())
    
    act(() => {
      result.current.setTheme(true)
    })
    
    expect(result.current.isDark).toBe(true)
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark')
  })

  it('applies dark theme classes to body', () => {
    const { result } = renderHook(() => useTheme())
    
    // Clear the initial calls from useEffect
    vi.clearAllMocks()
    
    act(() => {
      result.current.setTheme(true)
    })
    
    expect(classListMock.toggle).toHaveBeenCalledWith('dark', true)
    expect(classListMock.add).toHaveBeenCalledWith('ion-theme-dark')
    expect(classListMock.remove).toHaveBeenCalledWith('ion-theme-light')
  })

  it('applies light theme classes to body', () => {
    const { result } = renderHook(() => useTheme())
    
    // Clear the initial calls from useEffect
    vi.clearAllMocks()
    
    act(() => {
      result.current.setTheme(false)
    })
    
    expect(classListMock.toggle).toHaveBeenCalledWith('dark', false)
    expect(classListMock.add).toHaveBeenCalledWith('ion-theme-light')
    expect(classListMock.remove).toHaveBeenCalledWith('ion-theme-dark')
  })

  it('persists theme preference in localStorage', () => {
    const { result } = renderHook(() => useTheme())
    
    act(() => {
      result.current.setTheme(true)
    })
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark')
    
    act(() => {
      result.current.setTheme(false)
    })
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'light')
  })
})

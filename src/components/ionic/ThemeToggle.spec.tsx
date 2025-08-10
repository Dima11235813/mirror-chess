import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ThemeToggle, THEME_TOGGLE_ARIA_LABEL } from './ThemeToggle'
import { useTheme } from './useTheme'

// Mock the useTheme hook
vi.mock('./useTheme')

describe('ThemeToggle', () => {
  const mockUseTheme = vi.mocked(useTheme)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with light theme by default', () => {
    mockUseTheme.mockReturnValue({
      isDark: false,
      toggleTheme: vi.fn(),
      setTheme: vi.fn(),
    })

    render(<ThemeToggle />)
    
    expect(screen.getByText('Dark Theme')).toBeDefined()
    const toggle = screen.getByLabelText(THEME_TOGGLE_ARIA_LABEL)
    // Assert that the toggle is not checked (light theme)
    expect(toggle).toBeDefined()
    // Check the checked property since ion-toggle doesn't set it as a DOM attribute
    expect(toggle).toHaveProperty('checked', false)
  })

  it('renders with dark theme when enabled', () => {
    mockUseTheme.mockReturnValue({
      isDark: true,
      toggleTheme: vi.fn(),
      setTheme: vi.fn(),
    })

    render(<ThemeToggle />)
    
    expect(screen.getByText('Dark Theme')).toBeDefined()
    const toggle = screen.getByLabelText(THEME_TOGGLE_ARIA_LABEL)
    expect(toggle).toBeDefined()
    // Check the checked property since ion-toggle doesn't set it as a DOM attribute
    expect(toggle).toHaveProperty('checked', true)
  })

  it('calls toggleTheme when toggle is clicked', () => {
    const mockToggleTheme = vi.fn()
    mockUseTheme.mockReturnValue({
      isDark: false,
      toggleTheme: mockToggleTheme,
      setTheme: vi.fn(),
    })

    render(<ThemeToggle />)
    
    const toggle = screen.getByLabelText(THEME_TOGGLE_ARIA_LABEL)
    // Use the ionChange event which is what IonToggle actually fires
    fireEvent(toggle, new CustomEvent('ionChange', { detail: { checked: true } }))
    
    expect(mockToggleTheme).toHaveBeenCalledTimes(1)
  })

  it('applies custom className when provided', () => {
    mockUseTheme.mockReturnValue({
      isDark: false,
      toggleTheme: vi.fn(),
      setTheme: vi.fn(),
    })

    const { container } = render(<ThemeToggle className="custom-class" />)
    
    expect(container.querySelector('.custom-class')).toBeDefined()
  })

  it('has proper accessibility attributes', () => {
    mockUseTheme.mockReturnValue({
      isDark: false,
      toggleTheme: vi.fn(),
      setTheme: vi.fn(),
    })

    render(<ThemeToggle />)
    
    const toggle = screen.getByLabelText(THEME_TOGGLE_ARIA_LABEL)
    const ariaLabel = toggle.getAttribute('aria-label')
    expect(ariaLabel).toBe(THEME_TOGGLE_ARIA_LABEL)
  })
})

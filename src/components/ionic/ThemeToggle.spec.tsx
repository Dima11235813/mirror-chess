import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ThemeToggle } from './ThemeToggle'
import { useTheme } from './useTheme'

// Mock the useTheme hook
vi.mock('./useTheme')

describe('ThemeToggle', () => {
  const mockUseTheme = vi.mocked(useTheme)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.only('renders with light theme by default', () => {
    mockUseTheme.mockReturnValue({
      isDark: false,
      toggleTheme: vi.fn(),
      setTheme: vi.fn(),
    })

    render(<ThemeToggle />)
    
    expect(screen.getByText('Dark Theme')).toBeDefined()
    const toggle = screen.getByLabelText('Toggle dark theme')
    // Assert that the toggle is not checked (light theme)
    console.log(toggle)
    // Check console log and determine how to best assert that toggle is light
    expect(toggle).to
  })

  it('renders with dark theme when enabled', () => {
    mockUseTheme.mockReturnValue({
      isDark: true,
      toggleTheme: vi.fn(),
      setTheme: vi.fn(),
    })

    render(<ThemeToggle />)
    
    expect(screen.getByText('Dark Theme')).toBeDefined()
    const toggle = screen.getByLabelText('Toggle dark theme')
    expect(toggle)
  })

  it('calls toggleTheme when toggle is clicked', () => {
    const mockToggleTheme = vi.fn()
    mockUseTheme.mockReturnValue({
      isDark: false,
      toggleTheme: mockToggleTheme,
      setTheme: vi.fn(),
    })

    render(<ThemeToggle />)
    
    const toggle = screen.getByLabelText('Toggle dark theme')
    fireEvent.click(toggle)
    
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
    
    const toggle = screen.getByLabelText('Toggle dark theme')
    // TODO Fix this once console log reveals how to best check IonToggle state
    // expect(toggle).toHaveAttribute('aria-label', 'Toggle dark theme')
  })
})

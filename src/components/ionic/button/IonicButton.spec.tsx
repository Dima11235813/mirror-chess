import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { IonicButton } from './IonicButton'
import { mockIonicButtonProps } from './button.mocks'

// Mock IonButton to avoid Ionic dependencies in tests
vi.mock('@ionic/react', () => ({
  IonButton: ({ children, ...props }: any) => {
    // Debug: log what props are received
    console.log('IonButton mock received props:', props)
    
    // Simple mock that passes through all props as attributes
    return (
      <button data-testid="ion-button" {...props}>
        {children}
      </button>
    )
  },
}))

describe('IonicButton Integration', () => {
  it('renders with default props', () => {
    render(<IonicButton>Default Button</IonicButton>)
    
    const button = screen.getByTestId('ion-button') as HTMLButtonElement
    expect(button).toBeDefined()
    expect(button.textContent).toBe('Default Button')
    expect(button.getAttribute('color')).toBe('primary')
    expect(button.getAttribute('size')).toBe('default')
    expect(button.getAttribute('fill')).toBe('solid')
    expect(button.getAttribute('type')).toBe('button')
    expect(button.disabled).toBe(false)
  })

  it('renders with custom color', () => {
    render(<IonicButton color="danger">Delete</IonicButton>)
    
    const button = screen.getByTestId('ion-button')
    expect(button.getAttribute('color')).toBe('danger')
  })

  it('renders with custom size', () => {
    render(<IonicButton size="large">Large Button</IonicButton>)
    
    const button = screen.getByTestId('ion-button')
    expect(button.getAttribute('size')).toBe('large')
  })

  it('renders with round shape', () => {
    render(<IonicButton shape="round">Round Button</IonicButton>)
    
    const button = screen.getByTestId('ion-button')
    expect(button.getAttribute('shape')).toBe('round')
  })

  it('renders with custom fill', () => {
    render(<IonicButton fill="outline">Outline Button</IonicButton>)
    
    const button = screen.getByTestId('ion-button')
    expect(button.getAttribute('fill')).toBe('outline')
  })

  it('renders disabled button', () => {
    render(<IonicButton disabled>Disabled Button</IonicButton>)
    
    const button = screen.getByTestId('ion-button') as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it('renders with expand block', () => {
    render(<IonicButton expand="block">Block Button</IonicButton>)
    
    const button = screen.getByTestId('ion-button')
    expect(button.getAttribute('expand')).toBe('block')
  })

  it('renders with strong text', () => {
    render(<IonicButton strong>Strong Button</IonicButton>)
    
    const button = screen.getByTestId('ion-button')
    expect(button.getAttribute('strong')).toBe('true')
  })

  it('renders with custom type', () => {
    render(<IonicButton type="submit">Submit Button</IonicButton>)
    
    const button = screen.getByTestId('ion-button')
    expect(button.getAttribute('type')).toBe('submit')
  })

  it('renders with aria-label', () => {
    render(<IonicButton aria-label="Custom label">Accessible Button</IonicButton>)
    
    const button = screen.getByTestId('ion-button')
    expect(button.getAttribute('aria-label')).toBe('Custom label')
  })

  it('renders with data-testid', () => {
    render(<IonicButton data-testid="custom-test-id">Test Button</IonicButton>)
    
    const button = screen.getByTestId('custom-test-id')
    expect(button).toBeDefined()
  })

  it('renders with custom className', () => {
    render(<IonicButton className="custom-class">Custom Class Button</IonicButton>)
    
    const button = screen.getByTestId('ion-button')
    expect(button.className).toContain('custom-class')
  })

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<IonicButton onClick={handleClick}>Clickable Button</IonicButton>)
    
    const button = screen.getByTestId('ion-button')
    button.click()
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('renders with mock configurations', () => {
    // Test a few key mock configurations
    const testCases = [
      { name: 'primary', props: mockIonicButtonProps?.primary },
      { name: 'danger', props: mockIonicButtonProps?.danger },
      { name: 'round', props: mockIonicButtonProps?.round },
      { name: 'block', props: mockIonicButtonProps?.block },
    ]

    testCases.forEach(({ name, props }) => {
      // Ensure props has required children
      const testProps = { ...props, children: props?.children || 'Test Button' }
      const { unmount } = render(<IonicButton {...testProps} />)
      
      const button = screen.getByTestId('ion-button')
      expect(button).toBeDefined()
      expect(button.textContent).toBe(testProps.children as string)
      
      // Verify specific props are applied
      if (testProps.color) {
        expect(button.getAttribute('color')).toBe(testProps.color)
      }
      if (testProps.size) {
        expect(button.getAttribute('size')).toBe(testProps.size)
      }
      if (testProps.fill) {
        expect(button.getAttribute('fill')).toBe(testProps.fill)
      }
      if (testProps.disabled) {
        const buttonElement = button as HTMLButtonElement
        expect(buttonElement.disabled).toBe(true)
      }
      if (testProps.shape) {
        expect(button.getAttribute('shape')).toBe(testProps.shape)
      }
      if (testProps.expand) {
        expect(button.getAttribute('expand')).toBe(testProps.expand)
      }
      if (testProps.strong) {
        expect(button.getAttribute('strong')).toBe('true')
      }
      if (testProps.type) {
        expect(button.getAttribute('type')).toBe(testProps.type)
      }
      if (testProps['aria-label']) {
        expect(button.getAttribute('aria-label')).toBe(testProps['aria-label'])
      }
      if (testProps['data-testid']) {
        expect(screen.getByTestId(testProps['data-testid'] as string)).toBeDefined()
      }
      
      unmount()
    })
  })

  it('passes through additional props', () => {
    render(
      <IonicButton 
        data-custom="value"
        id="custom-id"
        title="Custom title"
      >
        Custom Props Button
      </IonicButton>
    )
    
    const button = screen.getByTestId('ion-button')
    expect(button.getAttribute('data-custom')).toBe('value')
    expect(button.getAttribute('id')).toBe('custom-id')
    expect(button.getAttribute('title')).toBe('Custom title')
  })
})

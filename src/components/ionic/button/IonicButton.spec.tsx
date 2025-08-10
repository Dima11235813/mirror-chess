import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { IonicButton } from './IonicButton'
import { mockIonicButtonProps } from './button.mocks'

// Mock IonButton to avoid Ionic dependencies in tests
vi.mock('@ionic/react', () => ({
  IonButton: ({ children, ...props }: any) => {
    // Convert props to attributes for testing
    const attributes: Record<string, string> = {}
    
    // Handle boolean props - convert to string attributes
    if (props.strong !== undefined) attributes.strong = props.strong ? 'true' : 'false'
    if (props.disabled !== undefined) attributes.disabled = props.disabled ? 'true' : 'false'
    
    // Handle string props - only add if they exist
    if (props.color !== undefined) attributes.color = props.color
    if (props.size !== undefined) attributes.size = props.size
    if (props.fill !== undefined) attributes.fill = props.fill
    if (props.shape !== undefined) attributes.shape = props.shape
    if (props.expand !== undefined) attributes.expand = props.expand
    if (props.type !== undefined) attributes.type = props.type
    if (props.className !== undefined) attributes.className = props.className
    
    // Handle event handlers and other props
    const eventProps: Record<string, any> = {}
    if (props.onClick) eventProps.onClick = props.onClick
    if (props['aria-label']) attributes['aria-label'] = props['aria-label']
    if (props['data-testid']) attributes['data-testid'] = props['data-testid']
    
    // Spread remaining props
    Object.assign(attributes, props)
    
    return (
      <button data-testid="ion-button" {...attributes} {...eventProps}>
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
      const { unmount } = render(<IonicButton {...props} />)
      
      const button = screen.getByTestId('ion-button')
      expect(button).toBeDefined()
      expect(button.textContent).toBe(props?.children as string)
      
      // Verify specific props are applied
      if (props?.color) {
        expect(button.getAttribute('color')).toBe(props?.color)
      }
      if (props?.size) {
        expect(button.getAttribute('size')).toBe(props?.size)
      }
      if (props?.fill) {
        expect(button.getAttribute('fill')).toBe(props?.fill)
      }
      if (props?.disabled) {
        const buttonElement = button as HTMLButtonElement
        expect(buttonElement.disabled).toBe(true)
      }
      if (props?.shape) {
        expect(button.getAttribute('shape')).toBe(props?.shape)
      }
      if (props?.expand) {
        expect(button.getAttribute('expand')).toBe(props?.expand)
      }
      if (props?.strong) {
        expect(button.getAttribute('strong')).toBe('true')
      }
      if (props?.type) {
        expect(button.getAttribute('type')).toBe(props?.type)
      }
      if (props['aria-label']) {
        expect(button.getAttribute('aria-label')).toBe(props['aria-label'])
      }
      if (props['data-testid']) {
        expect(screen.getByTestId(props['data-testid'] as string)).toBeDefined()
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

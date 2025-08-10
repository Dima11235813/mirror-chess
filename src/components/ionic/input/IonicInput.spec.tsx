import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { IonicInput } from './IonicInput'
import { mockIonicInputProps } from './input.mocks'

// Mock IonInput to avoid Ionic dependencies in tests
vi.mock('@ionic/react', () => ({
  IonInput: ({ ...props }: any) => {
    // Simple mock that passes through all props as attributes
    return (
      <input data-testid="ion-input" {...props} />
    )
  },
}))

describe('IonicInput Integration', () => {
  it('renders with default props', () => {
    render(<IonicInput placeholder="Enter text..." />)
    
    const input = screen.getByTestId('ion-input') as HTMLInputElement
    expect(input).toBeDefined()
    expect(input.getAttribute('type')).toBe('text')
    expect(input.getAttribute('placeholder')).toBe('Enter text...')
    expect(input.getAttribute('disabled')).toBe('false')
    expect(input.getAttribute('readonly')).toBe('false')
    expect(input.getAttribute('required')).toBe('false')
    expect(input.getAttribute('autocomplete')).toBe('off')
    expect(input.getAttribute('autocorrect')).toBe('off')
    expect(input.getAttribute('autocapitalize')).toBe('off')
    expect(input.getAttribute('spellcheck')).toBe('false')
    expect(input.getAttribute('clearInput')).toBe('false')
    expect(input.getAttribute('clearOnEdit')).toBe('false')
    expect(input.getAttribute('color')).toBe('primary')
    expect(input.getAttribute('fill')).toBe('outline')
    expect(input.getAttribute('size')).toBe('default')
    expect(input.getAttribute('labelPlacement')).toBe('floating')
    expect(input.getAttribute('counter')).toBe('false')
    expect(input.getAttribute('mode')).toBe('md')
  })

  it('renders with custom type', () => {
    render(<IonicInput type="email" placeholder="Enter email" />)
    
    const input = screen.getByTestId('ion-input')
    expect(input.getAttribute('type')).toBe('email')
  })

  it('renders with custom color', () => {
    render(<IonicInput color="danger" placeholder="Error input" />)
    
    const input = screen.getByTestId('ion-input')
    expect(input.getAttribute('color')).toBe('danger')
  })

  it('renders with custom size', () => {
    render(<IonicInput size="large" placeholder="Large input" />)
    
    const input = screen.getByTestId('ion-input')
    expect(input.getAttribute('size')).toBe('large')
  })

  it('renders with custom fill', () => {
    render(<IonicInput fill="solid" placeholder="Solid input" />)
    
    const input = screen.getByTestId('ion-input')
    expect(input.getAttribute('fill')).toBe('solid')
  })

  it('renders with round shape', () => {
    render(<IonicInput shape="round" placeholder="Round input" />)
    
    const input = screen.getByTestId('ion-input')
    expect(input.getAttribute('shape')).toBe('round')
  })

  it('renders with custom labelPlacement', () => {
    render(<IonicInput labelPlacement="stacked" label="Stacked Label" />)
    
    const input = screen.getByTestId('ion-input')
    expect(input.getAttribute('labelPlacement')).toBe('stacked')
  })

  it('renders with label', () => {
    render(<IonicInput label="Test Label" placeholder="Test input" />)
    
    const input = screen.getByTestId('ion-input')
    expect(input.getAttribute('label')).toBe('Test Label')
  })

  it('renders with helper text', () => {
    render(<IonicInput helperText="This is helper text" placeholder="Test input" />)
    
    const input = screen.getByTestId('ion-input')
    expect(input.getAttribute('helperText')).toBe('This is helper text')
  })

  it('renders with error text', () => {
    render(<IonicInput errorText="This is an error" placeholder="Test input" />)
    
    const input = screen.getByTestId('ion-input')
    expect(input.getAttribute('errorText')).toBe('This is an error')
  })

  it('renders with counter', () => {
    render(<IonicInput counter placeholder="Test input" />)
    
    const input = screen.getByTestId('ion-input')
    expect(input.getAttribute('counter')).toBe('true')
  })

  it('renders with value', () => {
    render(<IonicInput value="test value" placeholder="Test input" />)
    
    const input = screen.getByTestId('ion-input')
    expect(input.getAttribute('value')).toBe('test value')
  })

  it('renders disabled state', () => {
    render(<IonicInput disabled placeholder="Disabled input" />)
    
    const input = screen.getByTestId('ion-input') as HTMLInputElement
    expect(input.disabled).toBe(true)
  })

  it('renders readonly state', () => {
    render(<IonicInput readonly placeholder="Readonly input" />)
    
    const input = screen.getByTestId('ion-input')
    expect(input.getAttribute('readonly')).toBe('true')
  })

  it('renders required state', () => {
    render(<IonicInput required placeholder="Required input" />)
    
    const input = screen.getByTestId('ion-input')
    expect(input.getAttribute('required')).toBe('true')
  })

  it('renders with validation attributes', () => {
    render(
      <IonicInput 
        minlength={3}
        maxlength={20}
        min={0}
        max={100}
        step="0.1"
        pattern="[A-Za-z]+"
        placeholder="Validated input"
      />
    )
    
    const input = screen.getByTestId('ion-input')
    expect(input.getAttribute('minlength')).toBe('3')
    expect(input.getAttribute('maxlength')).toBe('20')
    expect(input.getAttribute('min')).toBe('0')
    expect(input.getAttribute('max')).toBe('100')
    expect(input.getAttribute('step')).toBe('0.1')
    expect(input.getAttribute('pattern')).toBe('[A-Za-z]+')
  })

  it('renders with accessibility attributes', () => {
    render(
      <IonicInput 
        aria-label="Custom aria label"
        data-testid="custom-test-id"
        placeholder="Accessible input"
      />
    )
    
    const input = screen.getByTestId('ion-input')
    expect(input.getAttribute('aria-label')).toBe('Custom aria label')
    expect(input.getAttribute('data-testid')).toBe('custom-test-id')
  })

  it('renders with autocomplete attributes', () => {
    render(
      <IonicInput 
        autocomplete="email"
        autocorrect="on"
        autocapitalize="words"
        spellcheck
        placeholder="Autocomplete input"
      />
    )
    
    const input = screen.getByTestId('ion-input')
    expect(input.getAttribute('autocomplete')).toBe('email')
    expect(input.getAttribute('autocorrect')).toBe('on')
    expect(input.getAttribute('autocapitalize')).toBe('words')
    expect(input.getAttribute('spellcheck')).toBe('true')
  })

  it('renders with input mode and enter key hint', () => {
    render(
      <IonicInput 
        inputmode="numeric"
        enterkeyhint="done"
        placeholder="Numeric input"
      />
    )
    
    const input = screen.getByTestId('ion-input')
    expect(input.getAttribute('inputmode')).toBe('numeric')
    expect(input.getAttribute('enterkeyhint')).toBe('done')
  })

  it('renders with clear options', () => {
    render(
      <IonicInput 
        clearInput
        clearOnEdit
        placeholder="Clearable input"
      />
    )
    
    const input = screen.getByTestId('ion-input')
    expect(input.getAttribute('clearInput')).toBe('true')
    expect(input.getAttribute('clearOnEdit')).toBe('true')
  })

  it('renders with custom mode', () => {
    render(<IonicInput mode="ios" placeholder="iOS input" />)
    
    const input = screen.getByTestId('ion-input')
    expect(input.getAttribute('mode')).toBe('ios')
  })

  it('renders with custom className', () => {
    render(<IonicInput className="custom-class" placeholder="Custom input" />)
    
    const input = screen.getByTestId('ion-input')
    expect(input.getAttribute('class')).toBe('custom-class')
  })

  it('renders with name attribute', () => {
    render(<IonicInput name="test-name" placeholder="Named input" />)
    
    const input = screen.getByTestId('ion-input')
    expect(input.getAttribute('name')).toBe('test-name')
  })

  it('renders with counter formatter', () => {
    const formatter = (inputLength: number, maxLength: number) => 
      `${inputLength}/${maxLength} characters`
    
    render(
      <IonicInput 
        counterFormatter={formatter}
        counter
        maxlength={50}
        placeholder="Formatted counter input"
      />
    )
    
    const input = screen.getByTestId('ion-input')
    expect(input.getAttribute('counterFormatter')).toBeDefined()
  })

  it('renders with all mock configurations', () => {
    const mockConfigs = Object.keys(mockIonicInputProps)
    
    mockConfigs.forEach(configName => {
      const { rerender } = render(
        <IonicInput {...mockIonicInputProps[configName]} />
      )
      
      const input = screen.getByTestId('ion-input')
    //   assert input is rendered
      expect(input).toBeDefined()
      
      // Test a few key props for each configuration
      const config = mockIonicInputProps[configName]
      if (config?.type) {
        expect(input.getAttribute('type')).toBe(config.type)
      }
      if (config?.placeholder) {
        expect(input.getAttribute('placeholder')).toBe(config.placeholder)
      }
      if (config?.value) {
        expect(input.getAttribute('value')).toBe(String(config.value))
      }
    })
  })
})

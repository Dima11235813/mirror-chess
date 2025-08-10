import { describe, expect, it } from 'vitest'
import { defaultProps } from './input.types'
import type { IonicInputProps } from './input.types'

describe('IonicInput Types and Defaults', () => {
  it('has correct default props structure', () => {
    expect(defaultProps).toEqual({
      type: "text",
      disabled: false,
      readonly: false,
      required: false,
      autocomplete: "off",
      autocorrect: "off",
      autocapitalize: "off",
      spellcheck: false,
      clearInput: false,
      clearOnEdit: false,
      color: "primary",
      fill: "outline",
      size: "default",
      labelPlacement: "floating",
      counter: false,
      mode: "md",
    })
  })

  it('default props match expected types', () => {
    // Type check that defaultProps conforms to IonicInputProps
    const props: Partial<IonicInputProps> = {
      ...defaultProps,
    }
    
    expect(props.type).toBe('text')
    expect(props.disabled).toBe(false)
    expect(props.readonly).toBe(false)
    expect(props.required).toBe(false)
    expect(props.autocomplete).toBe('off')
    expect(props.autocorrect).toBe('off')
    expect(props.autocapitalize).toBe('off')
    expect(props.spellcheck).toBe(false)
    expect(props.clearInput).toBe(false)
    expect(props.clearOnEdit).toBe(false)
    expect(props.color).toBe('primary')
    expect(props.fill).toBe('outline')
    expect(props.size).toBe('default')
    expect(props.labelPlacement).toBe('floating')
    expect(props.counter).toBe(false)
    expect(props.mode).toBe('md')
  })

  it('allows valid type values', () => {
    const validTypes: IonicInputProps['type'][] = [
      "text", "password", "email", "number", "search", "tel", "url"
    ]
    
    validTypes.forEach(type => {
      const props: Partial<IonicInputProps> = { type }
      expect(props.type).toBe(type)
    })
  })

  it('allows valid color values', () => {
    const validColors: IonicInputProps['color'][] = [
      "primary", "secondary", "tertiary", "success", 
      "warning", "danger", "light", "medium", "dark"
    ]
    
    validColors.forEach(color => {
      const props: Partial<IonicInputProps> = { color }
      expect(props.color).toBe(color)
    })
  })

  it('allows valid fill values', () => {
    const validFills: IonicInputProps['fill'][] = [
      "outline", "solid"
    ]
    
    validFills.forEach(fill => {
      const props: Partial<IonicInputProps> = { fill }
      expect(props.fill).toBe(fill)
    })
  })

  it('allows valid size values', () => {
    const validSizes: IonicInputProps['size'][] = [
      "small", "default", "large"
    ]
    
    validSizes.forEach(size => {
      const props: Partial<IonicInputProps> = { size }
      expect(props.size).toBe(size)
    })
  })

  it('allows valid labelPlacement values', () => {
    const validPlacements: IonicInputProps['labelPlacement'][] = [
      "start", "end", "floating", "stacked"
    ]
    
    validPlacements.forEach(placement => {
      const props: Partial<IonicInputProps> = { labelPlacement: placement }
      expect(props.labelPlacement).toBe(placement)
    })
  })

  it('allows valid mode values', () => {
    const validModes: IonicInputProps['mode'][] = [
      "ios", "md"
    ]
    
    validModes.forEach(mode => {
      const props: Partial<IonicInputProps> = { mode }
      expect(props.mode).toBe(mode)
    })
  })

  it('allows valid autocomplete values', () => {
    const validAutocomplete: IonicInputProps['autocomplete'][] = [
      "on", "off", "name", "email", "username", 
      "current-password", "new-password", "tel", "url"
    ]
    
    validAutocomplete.forEach(autocomplete => {
      const props: Partial<IonicInputProps> = { autocomplete }
      expect(props.autocomplete).toBe(autocomplete)
    })
  })

  it('allows valid autocorrect values', () => {
    const validAutocorrect: IonicInputProps['autocorrect'][] = [
      "on", "off"
    ]
    
    validAutocorrect.forEach(autocorrect => {
      const props: Partial<IonicInputProps> = { autocorrect }
      expect(props.autocorrect).toBe(autocorrect)
    })
  })

  it('allows valid autocapitalize values', () => {
    const validAutocapitalize: IonicInputProps['autocapitalize'][] = [
      "off", "none", "sentences", "words", "characters"
    ]
    
    validAutocapitalize.forEach(autocapitalize => {
      const props: Partial<IonicInputProps> = { autocapitalize }
      expect(props.autocapitalize).toBe(autocapitalize)
    })
  })

  it('allows valid inputmode values', () => {
    const validInputModes: IonicInputProps['inputmode'][] = [
      "none", "text", "tel", "url", "email", "numeric", "decimal", "search"
    ]
    
    validInputModes.forEach(inputmode => {
      const props: Partial<IonicInputProps> = { inputmode }
      expect(props.inputmode).toBe(inputmode)
    })
  })

  it('allows valid enterkeyhint values', () => {
    const validEnterKeyHints: IonicInputProps['enterkeyhint'][] = [
      "enter", "done", "go", "next", "previous", "search", "send"
    ]
    
    validEnterKeyHints.forEach(enterkeyhint => {
      const props: Partial<IonicInputProps> = { enterkeyhint }
      expect(props.enterkeyhint).toBe(enterkeyhint)
    })
  })

  it('allows valid shape values', () => {
    const validShapes: IonicInputProps['shape'][] = [
      'round'
    ]
    
    validShapes.forEach(shape => {
      const props: Partial<IonicInputProps> = { shape }
      expect(props.shape).toBe(shape)
    })
  })

  it('allows valid step values', () => {
    const validSteps = ["0.1", "1", "10", "any"]
    
    validSteps.forEach(step => {
      const props: Partial<IonicInputProps> = { step }
      expect(props.step).toBe(step)
    })
  })

  it('allows valid min/max length values', () => {
    const validLengths = [1, 10, 100, 1000]
    
    validLengths.forEach(length => {
      const props: Partial<IonicInputProps> = { minlength: length, maxlength: length }
      expect(props.minlength).toBe(length)
      expect(props.maxlength).toBe(length)
    })
  })

  it('allows valid min/max values', () => {
    const validNumbers = [0, 10, 100, -10]
    
    validNumbers.forEach(num => {
      const props: Partial<IonicInputProps> = { min: num, max: num }
      expect(props.min).toBe(num)
      expect(props.max).toBe(num)
    })
  })

  it('allows boolean values for boolean props', () => {
    const booleanProps: Partial<IonicInputProps> = {
      disabled: true,
      readonly: true,
      required: true,
      spellcheck: true,
      clearInput: true,
      clearOnEdit: true,
      counter: true,
    }
    
    expect(booleanProps.disabled).toBe(true)
    expect(booleanProps.readonly).toBe(true)
    expect(booleanProps.required).toBe(true)
    expect(booleanProps.spellcheck).toBe(true)
    expect(booleanProps.clearInput).toBe(true)
    expect(booleanProps.clearOnEdit).toBe(true)
    expect(booleanProps.counter).toBe(true)
  })

  it('allows string values for string props', () => {
    const stringProps: Partial<IonicInputProps> = {
      value: "test value",
      placeholder: "test placeholder",
      name: "test-name",
      pattern: "test-pattern",
      label: "test label",
      helperText: "test helper text",
      errorText: "test error text",
      className: "test-class",
      "aria-label": "test aria label",
      "data-testid": "test-id",
    }
    
    expect(stringProps.value).toBe("test value")
    expect(stringProps.placeholder).toBe("test placeholder")
    expect(stringProps.name).toBe("test-name")
    expect(stringProps.pattern).toBe("test-pattern")
    expect(stringProps.label).toBe("test label")
    expect(stringProps.helperText).toBe("test helper text")
    expect(stringProps.errorText).toBe("test error text")
    expect(stringProps.className).toBe("test-class")
    expect(stringProps["aria-label"]).toBe("test aria label")
    expect(stringProps["data-testid"]).toBe("test-id")
  })

  it('allows number values for number props', () => {
    const numberProps: Partial<IonicInputProps> = {
      value: 42,
      minlength: 5,
      maxlength: 100,
      min: 0,
      max: 100,
    }
    
    expect(numberProps.value).toBe(42)
    expect(numberProps.minlength).toBe(5)
    expect(numberProps.maxlength).toBe(100)
    expect(numberProps.min).toBe(0)
    expect(numberProps.max).toBe(100)
  })

  it('allows null values for nullable props', () => {
    const nullProps: Partial<IonicInputProps> = {
      value: null,
    }
    
    expect(nullProps.value).toBe(null)
  })

  it('allows event handler functions', () => {
    const eventHandlers: Partial<IonicInputProps> = {
      onIonInput: (event: CustomEvent) => {},
      onIonBlur: (event: CustomEvent) => {},
      onIonFocus: (event: CustomEvent) => {},
      onChange: (event: React.ChangeEvent<HTMLIonInputElement>) => {},
      onBlur: (event: React.FocusEvent<HTMLIonInputElement>) => {},
      onFocus: (event: React.FocusEvent<HTMLIonInputElement>) => {},
    }
    
    expect(typeof eventHandlers.onIonInput).toBe('function')
    expect(typeof eventHandlers.onIonBlur).toBe('function')
    expect(typeof eventHandlers.onIonFocus).toBe('function')
    expect(typeof eventHandlers.onChange).toBe('function')
    expect(typeof eventHandlers.onBlur).toBe('function')
    expect(typeof eventHandlers.onFocus).toBe('function')
  })

  it('allows counter formatter function', () => {
    const formatter = (inputLength: number, maxLength: number) => `${inputLength}/${maxLength}`
    const props: Partial<IonicInputProps> = { counterFormatter: formatter }
    
    expect(typeof props.counterFormatter).toBe('function')
    expect(props.counterFormatter!(5, 10)).toBe('5/10')
  })
})




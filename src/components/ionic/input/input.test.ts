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
      const props: Partial<IonicInputProps> = {
        type: type!,
      }
      expect(props.type).toBe(type)
    })
  })

  it('allows valid color values', () => {
    const validColors: IonicInputProps['color'][] = [
      "primary", "secondary", "tertiary", "success", 
      "warning", "danger", "light", "medium", "dark"
    ]
    
    validColors.forEach(color => {
      const props: Partial<IonicInputProps> = {
        color: color!,
      }
      expect(props.color).toBe(color)
    })
  })

  it('allows valid size values', () => {
    const validSizes: IonicInputProps['size'][] = [
      "small", "default", "large"
    ]
    
    validSizes.forEach(size => {
      const props: Partial<IonicInputProps> = {
        size: size!,
      }
      expect(props.size).toBe(size)
    })
  })

  it('allows valid fill values', () => {
    const validFills: IonicInputProps['fill'][] = [
      "outline", "solid"
    ]
    
    validFills.forEach(fill => {
      const props: Partial<IonicInputProps> = {
        fill: fill!,
      }
      expect(props.fill).toBe(fill)
    })
  })

  it('allows valid shape values', () => {
    const validShapes: IonicInputProps['shape'][] = [
      'round'
    ]
    
    validShapes.forEach(shape => {
      const props: Partial<IonicInputProps> = {
        shape: shape!,
      }
      expect(props.shape).toBe(shape)
    })
  })

  it('allows valid labelPlacement values', () => {
    const validPlacements: IonicInputProps['labelPlacement'][] = [
      "start", "end", "floating", "stacked"
    ]
    
    validPlacements.forEach(placement => {
      const props: Partial<IonicInputProps> = {
        labelPlacement: placement!,
      }
      expect(props.labelPlacement).toBe(placement)
    })
  })

  it('allows valid autocomplete values', () => {
    const validAutocomplete: IonicInputProps['autocomplete'][] = [
      "on", "off", "name", "email", "username", 
      "current-password", "new-password", "tel", "url"
    ]
    
    validAutocomplete.forEach(autocomplete => {
      const props: Partial<IonicInputProps> = {
        autocomplete: autocomplete!,
      }
      expect(props.autocomplete).toBe(autocomplete)
    })
  })

  it('allows valid autocorrect values', () => {
    const validAutocorrect: IonicInputProps['autocorrect'][] = [
      "on", "off"
    ]
    
    validAutocorrect.forEach(autocorrect => {
      const props: Partial<IonicInputProps> = {
        autocorrect: autocorrect!,
      }
      expect(props.autocorrect).toBe(autocorrect)
    })
  })

  it('allows valid autocapitalize values', () => {
    const validAutocapitalize: IonicInputProps['autocapitalize'][] = [
      "off", "none", "sentences", "words", "characters"
    ]
    
    validAutocapitalize.forEach(autocapitalize => {
      const props: Partial<IonicInputProps> = {
        autocapitalize: autocapitalize!,
      }
      expect(props.autocapitalize).toBe(autocapitalize)
    })
  })

  it('allows valid inputmode values', () => {
    const validInputModes: IonicInputProps['inputmode'][] = [
      "none", "text", "tel", "url", "email", "numeric", "decimal", "search"
    ]
    
    validInputModes.forEach(inputmode => {
      const props: Partial<IonicInputProps> = {
        inputmode: inputmode!,
      }
      expect(props.inputmode).toBe(inputmode)
    })
  })

  it('allows valid enterkeyhint values', () => {
    const validEnterKeyHints: IonicInputProps['enterkeyhint'][] = [
      "enter", "done", "go", "next", "previous", "search", "send"
    ]
    
    validEnterKeyHints.forEach(enterkeyhint => {
      const props: Partial<IonicInputProps> = {
        enterkeyhint: enterkeyhint!,
      }
      expect(props.enterkeyhint).toBe(enterkeyhint)
    })
  })

  it('allows valid mode values', () => {
    const validModes: IonicInputProps['mode'][] = [
      "ios", "md"
    ]
    
    validModes.forEach(mode => {
      const props: Partial<IonicInputProps> = {
        mode: mode!,
      }
      expect(props.mode).toBe(mode)
    })
  })

  it('allows boolean props', () => {
    const props: Partial<IonicInputProps> = {
      disabled: true,
      readonly: true,
      required: true,
      spellcheck: true,
      clearInput: true,
      clearOnEdit: true,
      counter: true,
    }
    
    expect(props.disabled).toBe(true)
    expect(props.readonly).toBe(true)
    expect(props.required).toBe(true)
    expect(props.spellcheck).toBe(true)
    expect(props.clearInput).toBe(true)
    expect(props.clearOnEdit).toBe(true)
    expect(props.counter).toBe(true)
  })

  it('allows numeric props', () => {
    const props: Partial<IonicInputProps> = {
      minlength: 3,
      maxlength: 20,
      min: 0,
      max: 100,
      step: "0.1",
    }
    
    expect(props.minlength).toBe(3)
    expect(props.maxlength).toBe(20)
    expect(props.min).toBe(0)
    expect(props.max).toBe(100)
    expect(props.step).toBe("0.1")
  })

  it('allows string props', () => {
    const props: Partial<IonicInputProps> = {
      value: "test value",
      placeholder: "test placeholder",
      name: "test-name",
      pattern: "[A-Za-z]+",
      label: "Test Label",
      helperText: "Helper text",
      errorText: "Error text",
      className: "custom-class",
      "aria-label": "Custom aria label",
      "data-testid": "test-input",
    }
    
    expect(props.value).toBe("test value")
    expect(props.placeholder).toBe("test placeholder")
    expect(props.name).toBe("test-name")
    expect(props.pattern).toBe("[A-Za-z]+")
    expect(props.label).toBe("Test Label")
    expect(props.helperText).toBe("Helper text")
    expect(props.errorText).toBe("Error text")
    expect(props.className).toBe("custom-class")
    expect(props["aria-label"]).toBe("Custom aria label")
    expect(props["data-testid"]).toBe("test-input")
  })

  it('allows event handler props', () => {
    const onIonInput = (event: CustomEvent) => console.log(event)
    const onIonBlur = (event: CustomEvent) => console.log(event)
    const onIonFocus = (event: CustomEvent) => console.log(event)
    const onChange = (event: React.ChangeEvent<HTMLIonInputElement>) => console.log(event)
    const onBlur = (event: React.FocusEvent<HTMLIonInputElement>) => console.log(event)
    const onFocus = (event: React.FocusEvent<HTMLIonInputElement>) => console.log(event)
    
    const props: Partial<IonicInputProps> = {
      onIonInput,
      onIonBlur,
      onIonFocus,
      onChange,
      onBlur,
      onFocus,
    }
    
    expect(props.onIonInput).toBe(onIonInput)
    expect(props.onIonBlur).toBe(onIonBlur)
    expect(props.onIonFocus).toBe(onIonFocus)
    expect(props.onChange).toBe(onChange)
    expect(props.onBlur).toBe(onBlur)
    expect(props.onFocus).toBe(onFocus)
  })

  it('allows counterFormatter function', () => {
    const formatter = (inputLength: number, maxLength: number) => 
      `${inputLength}/${maxLength} characters`
    
    const props: Partial<IonicInputProps> = {
      counterFormatter: formatter,
    }
    
    expect(props.counterFormatter).toBe(formatter)
    expect(props.counterFormatter!(5, 20)).toBe("5/20 characters")
  })
})

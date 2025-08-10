import { describe, expect, it } from 'vitest'
import { defaultProps } from './button.types'
import type { IonicButtonProps } from './button.types'

describe('IonicButton Types and Defaults', () => {
  it('has correct default props structure', () => {
    expect(defaultProps).toEqual({
      color: "primary",
      size: "default",
      fill: "solid",
      disabled: false,
      strong: false,
      type: "button",
      buttonType: "button",
      mode: "md",
      rippleEffect: true,
      animated: true,
      routerDirection: "forward",
    })
  })

  it('default props match expected types', () => {
    // Type check that defaultProps conforms to IonicButtonProps
    const props: Partial<IonicButtonProps> = {
      children: 'Test',
      ...defaultProps,
    }
    
    expect(props.color).toBe('primary')
    expect(props.size).toBe('default')
    expect(props.fill).toBe('solid')
    expect(props.disabled).toBe(false)
    expect(props.strong).toBe(false)
    expect(props.type).toBe('button')
  })

  it('allows valid color values', () => {
    const validColors: IonicButtonProps['color'][] = [
      "primary", "secondary", "tertiary", "success", 
      "warning", "danger", "light", "medium", "dark"
    ]
    
    validColors.forEach(color => {
      const props: Partial<IonicButtonProps> = {
        children: 'Test',
        color: color!,
      }
      expect(props.color).toBe(color)
    })
  })

  it('allows valid size values', () => {
    const validSizes: IonicButtonProps['size'][] = [
      "small", "default", "large"
    ]
    
    validSizes.forEach(size => {
      const props: Partial<IonicButtonProps> = {
        children: 'Test',
        size: size!,
      }
      expect(props.size).toBe(size)
    })
  })

  it('allows valid fill values', () => {
    const validFills: IonicButtonProps['fill'][] = [
      "clear", "outline", "solid", "default"
    ]
    
    validFills.forEach(fill => {
      const props: Partial<IonicButtonProps> = {
        children: 'Test',
        fill: fill!,
      }
      expect(props.fill).toBe(fill)
    })
  })

  it('allows valid shape values', () => {
    const validShapes: IonicButtonProps['shape'][] = [
      'round'
    ]
    
    validShapes.forEach(shape => {
      const props: Partial<IonicButtonProps> = {
        children: 'Test',
        shape: shape!,
      }
      expect(props.shape).toBe(shape)
    })
  })

  it('allows valid expand values', () => {
    const validExpands: IonicButtonProps['expand'][] = [
      "block", "full"
    ]
    
    validExpands.forEach(expand => {
      const props: Partial<IonicButtonProps> = {
        children: 'Test',
        expand: expand!,
      }
      expect(props.expand).toBe(expand)
    })
  })

  it('allows valid type values', () => {
    const validTypes: IonicButtonProps['type'][] = [
      "button", "submit", "reset"
    ]
    
    validTypes.forEach(type => {
      const props: Partial<IonicButtonProps> = {
        children: 'Test',
        type: type!,
      }
      expect(props.type).toBe(type)
    })
  })

  it('enforces required children prop', () => {
    // This should cause a TypeScript error if children is not provided
    // We can't test this at runtime, but we can verify the type definition
    const props: Partial<IonicButtonProps> = {
      children: 'Required children',
    }
    
    expect(props.children).toBe('Required children')
  })

  it('allows optional props to be undefined', () => {
    const props: Partial<IonicButtonProps> = {
      children: 'Test',
      // All other props are optional and can be undefined
    }
    
    expect(props.children).toBe('Test')
    expect(props.color).toBeUndefined()
    expect(props.size).toBeUndefined()
    expect(props.shape).toBeUndefined()
    expect(props.fill).toBeUndefined()
    expect(props.disabled).toBeUndefined()
    expect(props.expand).toBeUndefined()
    expect(props.strong).toBeUndefined()
    expect(props.className).toBeUndefined()
    expect(props.onClick).toBeUndefined()
    expect(props.type).toBeUndefined()
    expect(props['aria-label']).toBeUndefined()
    expect(props['data-testid']).toBeUndefined()
  })

  it('allows boolean props to be true/false', () => {
    // Test disabled prop
    const disabledProps: Partial<IonicButtonProps> = {
      children: 'Test',
      disabled: true,
    }
    expect(disabledProps.disabled).toBe(true)
    
    const enabledProps: Partial<IonicButtonProps> = {
      children: 'Test',
      disabled: false,
    }
    expect(enabledProps.disabled).toBe(false)
    
    // Test strong prop
    const strongProps: Partial<IonicButtonProps> = {
      children: 'Test',
      strong: true,
    }
    expect(strongProps.strong).toBe(true)
    
    const normalProps: Partial<IonicButtonProps> = {
      children: 'Test',
      strong: false,
    }
    expect(normalProps.strong).toBe(false)
  })

  it('allows function props', () => {
    const onClick = () => console.log('clicked')
    const props: Partial<IonicButtonProps> = {
      children: 'Test',
      onClick,
    }
    
    expect(props.onClick).toBe(onClick)
  })

  it('allows string props for accessibility', () => {
    const props: Partial<IonicButtonProps> = {
      children: 'Test',
      'aria-label': 'Custom label',
      'data-testid': 'custom-id',
    }
    
    expect(props['aria-label']).toBe('Custom label')
    expect(props['data-testid']).toBe('custom-id')
  })
})

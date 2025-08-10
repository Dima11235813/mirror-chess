import type { IonicButtonProps } from './button.types'

/**
 * Mock data for testing the IonicButton component
 * Provides various configurations to test different prop combinations
 */

export const mockIonicButtonProps: Record<string, Partial<IonicButtonProps>> = {
  default: {
    children: 'Default Button',
  },
  primary: {
    children: 'Primary Button',
    color: 'primary',
    size: 'default',
    fill: 'solid',
  },
  secondary: {
    children: 'Secondary Button',
    color: 'secondary',
    size: 'default',
    fill: 'outline',
  },
  danger: {
    children: 'Delete',
    color: 'danger',
    size: 'small',
    fill: 'solid',
    strong: true,
  },
  success: {
    children: 'Save',
    color: 'success',
    size: 'large',
    fill: 'solid',
    strong: true,
  },
  disabled: {
    children: 'Disabled Button',
    disabled: true,
    color: 'medium',
  },
  small: {
    children: 'Small Button',
    size: 'small',
    color: 'tertiary',
  },
  large: {
    children: 'Large Button',
    size: 'large',
    color: 'primary',
    strong: true,
  },
  round: {
    children: 'Round',
    shape: 'round',
    color: 'primary',
    size: 'small',
  },
  block: {
    children: 'Full Width Button',
    expand: 'block',
    color: 'primary',
  },
  withAriaLabel: {
    children: 'Accessible Button',
    'aria-label': 'Custom aria label for testing',
    color: 'primary',
  },
  withTestId: {
    children: 'Testable Button',
    'data-testid': 'test-button',
    color: 'primary',
  },
}

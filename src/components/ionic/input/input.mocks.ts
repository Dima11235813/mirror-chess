import type { IonicInputProps } from './input.types'

/**
 * Mock data for testing the IonicInput component
 * Provides various configurations to test different prop combinations
 */

export const mockIonicInputProps: Record<string, Partial<IonicInputProps>> = {
  default: {
    placeholder: 'Enter text...',
    value: '',
  },
  text: {
    type: 'text',
    placeholder: 'Enter your name',
    value: 'John Doe',
    label: 'Name',
  },
  email: {
    type: 'email',
    placeholder: 'Enter your email',
    value: 'john@example.com',
    label: 'Email',
    autocomplete: 'email',
  },
  password: {
    type: 'password',
    placeholder: 'Enter password',
    value: '',
    label: 'Password',
    autocomplete: 'current-password',
  },
  number: {
    type: 'number',
    placeholder: 'Enter age',
    value: 25,
    label: 'Age',
    min: 0,
    max: 120,
  },
  search: {
    type: 'search',
    placeholder: 'Search...',
    value: '',
    label: 'Search',
    clearInput: true,
  },
  disabled: {
    placeholder: 'Disabled input',
    value: 'Cannot edit',
    disabled: true,
    label: 'Disabled',
  },
  readonly: {
    placeholder: 'Readonly input',
    value: 'Cannot edit',
    readonly: true,
    label: 'Readonly',
  },
  required: {
    placeholder: 'Required field',
    value: '',
    required: true,
    label: 'Required Field *',
  },
  withHelper: {
    placeholder: 'Input with help',
    value: '',
    label: 'Helper Input',
    helperText: 'This text helps the user understand what to enter',
  },
  withError: {
    placeholder: 'Input with error',
    value: 'Invalid input',
    label: 'Error Input',
    errorText: 'This field contains an error',
    color: 'danger',
  },
  withCounter: {
    placeholder: 'Input with counter',
    value: 'Hello',
    label: 'Counter Input',
    counter: true,
    maxlength: 50,
  },
  small: {
    placeholder: 'Small input',
    value: '',
    size: 'small',
    label: 'Small',
  },
  large: {
    placeholder: 'Large input',
    value: '',
    size: 'large',
    label: 'Large',
  },
  outline: {
    placeholder: 'Outline input',
    value: '',
    fill: 'outline',
    label: 'Outline',
  },
  solid: {
    placeholder: 'Solid input',
    value: '',
    fill: 'solid',
    label: 'Solid',
  },
  round: {
    placeholder: 'Round input',
    value: '',
    shape: 'round',
    label: 'Round',
  },
  withAriaLabel: {
    placeholder: 'Accessible input',
    value: '',
    'aria-label': 'Custom aria label for testing',
  },
  withTestId: {
    placeholder: 'Testable input',
    value: '',
    'data-testid': 'test-input',
  },
  withValidation: {
    placeholder: 'Validated input',
    value: '',
    label: 'Validation',
    minlength: 3,
    maxlength: 20,
    pattern: '[A-Za-z]+',
    helperText: 'Only letters allowed, 3-20 characters',
  },
}

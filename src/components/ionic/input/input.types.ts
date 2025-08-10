import type { ComponentProps } from 'react'

/**
 * Props for the IonicInput wrapper component
 * Based on Ionic's IonInput component with additional customization options
 */
export interface IonicInputProps extends Omit<ComponentProps<typeof import('@ionic/react').IonInput>, 'children'> {
  /** Input value */
  readonly value?: string | number | null
  /** Input placeholder text */
  readonly placeholder?: string
  /** Input type */
  readonly type?: "text" | "password" | "email" | "number" | "search" | "tel" | "url"
  /** Whether input is disabled */
  readonly disabled?: boolean
  /** Whether input is readonly */
  readonly readonly?: boolean
  /** Whether input is required */
  readonly required?: boolean
  /** Input name attribute */
  readonly name?: string
  /** Input autocomplete attribute */
  readonly autocomplete?: "on" | "off" | "name" | "email" | "username" | "current-password" | "new-password" | "tel" | "url"
  /** Input autocorrect attribute */
  readonly autocorrect?: "on" | "off"
  /** Input autocapitalize attribute */
  readonly autocapitalize?: "off" | "none" | "sentences" | "words" | "characters"
  /** Input spellcheck attribute */
  readonly spellcheck?: boolean
  /** Input minlength attribute */
  readonly minlength?: number
  /** Input maxlength attribute */
  readonly maxlength?: number
  /** Input min attribute (for number inputs) */
  readonly min?: number
  /** Input max attribute (for number inputs) */
  readonly max?: number
  /** Input step attribute (for number inputs) */
  readonly step?: string
  /** Input pattern attribute */
  readonly pattern?: string
  /** Input inputmode attribute */
  readonly inputmode?: "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search"
  /** Input enterkeyhint attribute */
  readonly enterkeyhint?: "enter" | "done" | "go" | "next" | "previous" | "search" | "send"
  /** Input clearInput attribute */
  readonly clearInput?: boolean
  /** Input clearOnEdit attribute */
  readonly clearOnEdit?: boolean
  /** Input color variant */
  readonly color?: "primary" | "secondary" | "tertiary" | "success" | "warning" | "danger" | "light" | "medium" | "dark"
  /** Input fill variant */
  readonly fill?: "outline" | "solid"
  /** Input shape variant */
  readonly shape?: "round"
  /** Input size variant */
  readonly size?: "small" | "default" | "large"
  /** Input label */
  readonly label?: string
  /** Input label placement */
  readonly labelPlacement?: "start" | "end" | "floating" | "stacked"
  /** Input helper text */
  readonly helperText?: string
  /** Input error text */
  readonly errorText?: string
  /** Input counter text */
  readonly counter?: boolean
  /** Input counter formatter */
  readonly counterFormatter?: (inputLength: number, maxLength: number) => string
  /** Input mode for platform-specific styling */
  readonly mode?: "ios" | "md"
  /** Additional CSS class names */
  readonly className?: string
  /** Change handler */
  readonly onIonInput?: (event: CustomEvent) => void
  /** Blur handler */
  readonly onIonBlur?: (event: CustomEvent) => void
  /** Focus handler */
  readonly onIonFocus?: (event: CustomEvent) => void
  /** Change handler (compatibility with standard HTML input) */
  readonly onChange?: (event: React.ChangeEvent<HTMLIonInputElement>) => void
  /** Blur handler (compatibility with standard HTML input) */
  readonly onBlur?: (event: React.FocusEvent<HTMLIonInputElement>) => void
  /** Focus handler (compatibility with standard HTML input) */
  readonly onFocus?: (event: React.FocusEvent<HTMLIonInputElement>) => void
  /** ARIA label for accessibility */
  readonly "aria-label"?: string
  /** Data test ID for testing */
  readonly "data-testid"?: string
}

export const defaultProps: Partial<IonicInputProps> = {
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
  mode: "md", // Match your main.tsx configuration
}

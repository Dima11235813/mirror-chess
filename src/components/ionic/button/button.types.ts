import type { ComponentProps } from 'react'

/**
 * Props for the IonicButton wrapper component
 * Based on Ionic's IonButton component with additional customization options
 */
export interface IonicButtonProps extends Omit<ComponentProps<typeof import('@ionic/react').IonButton>, 'children'> {
  /** Button text content */
  readonly children: React.ReactNode
  /** Button color variant */
  readonly color?: "primary" | "secondary" | "tertiary" | "success" | "warning" | "danger" | "light" | "medium" | "dark"
  /** Button size variant */
  readonly size?: "small" | "default" | "large"
  /** Button shape variant */
  readonly shape?: 'round'
  /** Button fill variant */
  readonly fill?: "clear" | "outline" | "solid" | "default"
  /** Whether button is disabled */
  readonly disabled?: boolean
  /** Whether button is expandable */
  readonly expand?: "block" | "full"
  /** Whether button text is bold */
  readonly strong?: boolean
  /** Additional CSS class names */
  readonly className?: string
  /** Click handler */
  readonly onClick?: () => void
  /** Button type */
  readonly type?: "button" | "submit" | "reset"
  /** ARIA label for accessibility */
  readonly "aria-label"?: string
  /** Data test ID for testing */
  readonly "data-testid"?: string
}

export const defaultProps: Partial<IonicButtonProps> = {
  color: "primary",
  size: "default",
  fill: "solid",
  disabled: false,
  strong: false,
  type: "button",
}
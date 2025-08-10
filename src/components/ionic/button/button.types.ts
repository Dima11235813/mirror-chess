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
  /** Button mode for platform-specific styling */
  readonly mode?: "ios" | "md"
  /** Router direction for navigation */
  readonly routerDirection?: "forward" | "back" | "root"
  /** Whether button has ripple effect */
  readonly rippleEffect?: boolean
  /** Whether button is animated */
  readonly animated?: boolean
  /** Button type (alias for type) */
  readonly buttonType?: "button" | "submit" | "reset"
  /** Download attribute for links */
  readonly download?: string
  /** Form association */
  readonly form?: string | HTMLFormElement
  /** Href for anchor behavior */
  readonly href?: string
  /** Relationship attribute */
  readonly rel?: string
  /** Router animation */
  readonly routerAnimation?: any
  /** Target for links */
  readonly target?: string
}

export const defaultProps: Partial<IonicButtonProps> = {
  color: "primary",
  size: "default",
  fill: "solid",
  disabled: false,
  strong: false,
  type: "button",
  buttonType: "button",
  mode: "md", // Match your main.tsx configuration
  rippleEffect: true,
  animated: true,
  routerDirection: "forward",
}
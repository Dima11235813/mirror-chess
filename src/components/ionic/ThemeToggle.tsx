import { IonToggle, IonLabel, IonItem, IonIcon } from '@ionic/react'
import { moon, sunny } from 'ionicons/icons'
import { useTheme } from './useTheme'

export const THEME_TOGGLE_ARIA_LABEL = 'Toggle dark theme'

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme()

  return (
    <IonItem className={className ?? ""} button onClick={toggleTheme}>
      <IonIcon 
        icon={isDark ? moon : sunny} 
        slot="start"
        color={isDark ? "warning" : "primary"}
      />
      <IonLabel>Dark Theme</IonLabel>
      <IonToggle
        checked={isDark}
        onIonChange={toggleTheme}
        aria-label={THEME_TOGGLE_ARIA_LABEL}
        color="primary"
        enableOnOffLabels={true}
        labelPlacement="end"
        justify="space-between"
      />
    </IonItem>
  )
}

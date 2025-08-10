import { IonToggle, IonLabel, IonItem } from '@ionic/react'
import { useTheme } from './useTheme'

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme()

  return (
    <IonItem className={className ?? ""}>
      <IonLabel>Dark Theme</IonLabel>
      <IonToggle
        checked={isDark}
        onIonChange={toggleTheme}
        aria-label="Toggle dark theme"
      />
    </IonItem>
  )
}

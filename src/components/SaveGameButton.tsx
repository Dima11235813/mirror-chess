import { IonButton } from '@ionic/react'

export interface SaveGameButtonProps {
  readonly disabled: boolean
  readonly onClick: () => void
}

/** Pure button component. Parent controls `disabled` and `onClick`. */
export function SaveGameButton({ disabled, onClick }: SaveGameButtonProps) {
  return (
    <IonButton onClick={onClick} disabled={disabled} aria-disabled={disabled} data-testid="save-game-btn">
      Save Game
    </IonButton>
  )
}



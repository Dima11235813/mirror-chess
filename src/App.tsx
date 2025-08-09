import { useState } from 'react'
import { IonHeader, IonToolbar, IonTitle, IonButton } from '@ionic/react'
import { BoardView } from './components/BoardView'
import { initialPosition } from './game/setup'
import { reduceMove } from './game/reducer'
import type { GameState, Move } from './game/types'

export default function App() {
  const [state, setState] = useState<GameState>(() => initialPosition())

  const onMove = (m: Move) => setState(s => reduceMove(s, m))
  const onReset = () => setState(initialPosition())

  return (
    <div className="app">
      <IonHeader>
        <IonToolbar>
          <IonTitle>Mirror Chess v0.1</IonTitle>
          <div className="actions">
            <IonButton onClick={onReset}>Reset</IonButton>
          </div>
        </IonToolbar>
      </IonHeader>
      <BoardView state={state} onMove={onMove} />
      <footer className="footer">
        <p>Turn: <strong>{state.turn}</strong>{state.inCheck ? ' (check)' : ''}</p>
      </footer>
    </div>
  )
}



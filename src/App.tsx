import { useState } from 'react'
import { IonHeader, IonToolbar, IonTitle, IonButton } from '@ionic/react'
import { BoardView } from './components/BoardView'
import { initialPosition, fromPiecesSpec } from './game/setup'
import { reduceMove } from './game/reducer'
import type { GameState, Move } from './game/types'

function loadStateFromUrl(): GameState {
  const url = new URL(window.location.href)
  const spec = url.searchParams.get('board')
  const turn = (url.searchParams.get('turn') as 'white' | 'black') || 'white'
  if (spec) {
    try { return fromPiecesSpec(spec, turn) } catch { /* fallthrough */ }
  }
  return initialPosition()
}

export default function App() {
  const [state, setState] = useState<GameState>(() => loadStateFromUrl())

  const onMove = (m: Move) => setState(s => reduceMove(s, m))
  const onReset = () => setState(loadStateFromUrl())

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



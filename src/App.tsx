import { BoardView } from '@components/BoardView'
import { SaveGameButton } from '@components/SaveGameButton'
import { SavedGamesList } from '@components/SavedGamesList'
import { ThemeToggle } from '@components/ionic/ThemeToggle'
import { reduceMove } from '@game/reducer'
import { fromPiecesSpec, initialPosition } from '@game/setup'
import type { GameState, Move } from '@game/types'
import { IonButton, IonHeader, IonTitle, IonToolbar } from '@ionic/react'
import { deleteSavedGame, isValidGameName, listSavedGames, loadSavedGame, renameSavedGame, saveGame } from '@shared/persistence'
import { useMemo, useState } from 'react'

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
  const [moveCount, setMoveCount] = useState<number>(0)
  const [savesVersion, setSavesVersion] = useState<number>(0)

  const onMove = (m: Move) => setState(s => {
    const ns = reduceMove(s, m)
    if (ns !== s) setMoveCount(c => c + 1)
    return ns
  })
  const onReset = () => { setState(loadStateFromUrl()); setMoveCount(0) }

  const canSave = moveCount > 0
  const savedGames = useMemo(() => listSavedGames(), [savesVersion])

  const onSave = () => {
    if (!canSave) return
    saveGame(state)
    setSavesVersion(v => v + 1)
  }

  const onLoadSaved = (id: string) => {
    const loaded = loadSavedGame(id)
    if (loaded) {
      setState(loaded)
      setMoveCount(0)
    }
  }

  const onDeleteSaved = (id: string) => {
    deleteSavedGame(id)
    setSavesVersion(v => v + 1)
  }

  const onRenameSaved = (id: string, name: string) => {
    if (!isValidGameName(name)) return
    renameSavedGame(id, name)
    // list is derived from storage; reflect changes
    setSavesVersion(v => v + 1)
  }

  return (
    <div className="app">
      <IonHeader>
        <IonToolbar>
          <IonTitle>Mirror Chess v0.1</IonTitle>
          <div className="actions">
            <IonButton onClick={onReset}>Reset</IonButton>
            <SaveGameButton disabled={!canSave} onClick={onSave} />
            <ThemeToggle />
          </div>
        </IonToolbar>
      </IonHeader>
      <BoardView state={state} onMove={onMove} />
      <footer className="footer">
        <p>Turn: <strong>{state.turn}</strong>{state.inCheck ? ' (check)' : ''}</p>
      </footer>
      <section className="saves">
        <SavedGamesList items={savedGames} onLoad={onLoadSaved} onDelete={onDeleteSaved} onRename={onRenameSaved} />
      </section>
    </div>
  )
}



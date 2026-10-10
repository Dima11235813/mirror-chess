import { BoardView } from '@components/BoardView'
import { OpponentControls } from '@components/OpponentControls'
import { useEngineOpponent } from '@components/useEngineOpponent'
import { difficultyById, type DifficultyId } from '@engine/host/levels'
import { SaveGameButton } from '@components/SaveGameButton'
import { SavedGamesList } from '@components/SavedGamesList'
import { ThemeToggle } from '@components/ionic/ThemeToggle'
import { PuzzleScreen } from '@components/PuzzleScreen/PuzzleScreen'
import { SelfPlayScreen } from '@components/SelfPlayScreen/SelfPlayScreen'
import { SettingsDialog } from '@components/SettingsDialog'
import { loadSettings, saveSettings, type Settings } from '@shared/settings'
import { indexOfPuzzleId, puzzlesInPlayOrder } from '@/puzzles/set'
import { reduceMove } from '@game/reducer'
import { fromPiecesSpec, initialPosition } from '@game/setup'
import { DEFAULT_RULES, type RuleSet } from '@game/rules'
import { tryResolveRuleSet } from '@game/ruleset-registry'
import { gameStatus } from '@game/status'
import type { Color, GameState, Move } from '@game/types'
import { IonButton, IonHeader, IonTitle, IonToolbar } from '@ionic/react'
import { deleteSavedGame, isValidGameName, listSavedGames, loadSavedGame, renameSavedGame, saveGame } from '@shared/persistence'
import {
  GAME_STATUS_TESTID,
  PUZZLE_MODE_TESTID,
  WATCH_MODE_TESTID,
  SETTINGS_OPEN_TESTID,
} from '@shared/ui/selectors'
import { describeStatus } from '@shared/ui/status-text'
import { useCallback, useMemo, useState } from 'react'

/**
 * Build the starting state from the URL.
 *
 * `?board=` sets the position, `&turn=` whose move it is, and `&rules=` which variant
 * is being played — a ruleset token or a registered alias, e.g. `&rules=BRQ---` or
 * `&rules=sliders`. An absent or unrecognisable `rules` falls back to the default
 * rather than throwing, since a shared link is untrusted input.
 *
 * `&clock=` presets the 50-move counter. It exists because that rule is otherwise
 * unreachable in a test or a bug report — nobody is going to play a hundred halfmoves to
 * reproduce it — and it is the same class of affordance as `board`: a way to *state* a
 * position rather than reach it. Out-of-range or non-numeric values are ignored.
 */
function loadStateFromUrl(): GameState {
  const url = new URL(window.location.href)
  const spec = url.searchParams.get('board')
  const turn = (url.searchParams.get('turn') as 'white' | 'black') || 'white'
  const rules = tryResolveRuleSet(url.searchParams.get('rules'))?.rules ?? DEFAULT_RULES
  const base = spec ? fromSpecOrInitial(spec, turn, rules) : initialPosition(rules)
  const clock = Number(url.searchParams.get('clock'))
  return Number.isInteger(clock) && clock > 0 ? { ...base, halfmoveClock: clock } : base
}

function fromSpecOrInitial(spec: string, turn: 'white' | 'black', rules: RuleSet): GameState {
  try { return fromPiecesSpec(spec, turn, rules) } catch { return initialPosition(rules) }
}

/**
 * Which colour the engine plays, from `?engine=white|black`. Absent means two humans.
 *
 * A URL parameter rather than only a menu, for the same reason `?board=` exists: it makes
 * a specific situation reproducible in a test or a bug report.
 */
function engineSideFromUrl(): Color | null {
  const value = new URL(window.location.href).searchParams.get('engine')
  return value === 'white' || value === 'black' ? value : null
}

/** Engine strength from `?level=`, falling back to the default on anything unrecognised. */
function difficultyFromUrl(): DifficultyId {
  return difficultyById(new URL(window.location.href).searchParams.get('level')).id
}

/**
 * Which screen to open, from `?mode=`.
 *
 * A URL parameter and a header toggle, for the same reason `?board=` exists: a specific
 * situation should be reachable by a link, in a test or a bug report.
 *
 * `watch` is two engines playing each other — the game in progress is left untouched, as
 * puzzle mode leaves it (`prj-mgmt/epics/balance/watch-a-game.md`).
 */
type Screen = 'game' | 'puzzles' | 'watch'

function screenFromUrl(): Screen {
  const mode = new URL(window.location.href).searchParams.get('mode')
  return mode === 'puzzles' || mode === 'watch' ? mode : 'game'
}

/**
 * Which puzzle to open, from `?puzzle=`.
 *
 * Accepts a 1-based position (`?puzzle=2`) or a puzzle **id** (`?puzzle=1b53rpm`). The id
 * is the durable form: indexes shift whenever the set is re-mined, ids do not, so a bug
 * report should carry one.
 */
function puzzleIndexFromUrl(): number {
  const raw = new URL(window.location.href).searchParams.get('puzzle')
  if (!raw) return 0
  const byId = indexOfPuzzleId(raw)
  if (byId >= 0) return byId
  const position = Number(raw)
  return Number.isInteger(position) && position > 0 ? position - 1 : 0
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(() => screenFromUrl())
  /*
   * Settings are read once at startup and written on every change. Keeping them in the
   * shell rather than in a context is deliberate while there is exactly one of them: the
   * two screens that care are both rendered here, and a store would be ceremony around a
   * boolean.
   */
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [settingsOpen, setSettingsOpen] = useState(false)

  const changeSettings = useCallback((next: Settings) => {
    setSettings(next)
    saveSettings(next)
  }, [])
  const puzzleMode = screen === 'puzzles'
  const [state, setState] = useState<GameState>(() => loadStateFromUrl())
  const [moveCount, setMoveCount] = useState<number>(0)
  const [savesVersion, setSavesVersion] = useState<number>(0)
  const [engineSide, setEngineSide] = useState<Color | null>(() => engineSideFromUrl())
  const [difficulty, setDifficulty] = useState<DifficultyId>(() => difficultyFromUrl())

  const onMove = useCallback((m: Move) => setState(s => {
    const ns = reduceMove(s, m)
    if (ns !== s) setMoveCount(c => c + 1)
    return ns
  }), [])
  const onReset = () => { setState(loadStateFromUrl()); setMoveCount(0) }

  const canSave = moveCount > 0
  const savedGames = useMemo(() => listSavedGames(), [savesVersion])
  const status = useMemo(() => gameStatus(state), [state])

  const engine = useEngineOpponent({ state, status, engineSide, difficulty, onMove })

  // While the engine is thinking, the board belongs to it: accepting a click would let the
  // player move for their opponent, and the reply would then be computed for a position
  // that never existed.
  const boardLocked = engine.thinking || (engineSide !== null && state.turn === engineSide)

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
      {settingsOpen && (
        <SettingsDialog
          settings={settings}
          onChange={changeSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {/* The document's only h1. `ion-title` below renders inside a shadow root with no
          heading role, so without this there is nothing to navigate by. */}
      <h1 className="visually-hidden">Mirror Chess</h1>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Mirror Chess v0.1</IonTitle>
          <div className="actions">
            <IonButton
              data-testid={PUZZLE_MODE_TESTID}
              onClick={() => setScreen(s => (s === 'puzzles' ? 'game' : 'puzzles'))}
            >
              {puzzleMode ? 'Play a game' : 'Puzzles'}
            </IonButton>
            <IonButton
              data-testid={WATCH_MODE_TESTID}
              onClick={() => setScreen(s => (s === 'watch' ? 'game' : 'watch'))}
            >
              {screen === 'watch' ? 'Play a game' : 'Watch'}
            </IonButton>
            {/* Reset and Save act on the game, which is not what is on screen in puzzle or
                watch mode — a button that silently applies to something hidden is a trap.
                Caught in a screenshot on 2026-10-04: watch mode shipped them visible,
                because the condition was written as "not puzzles" rather than "is game". A
                boolean that means "the other screen" stops being true the moment there are
                three screens. */}
            {screen === 'game' && <IonButton onClick={onReset}>Reset</IonButton>}
            {screen === 'game' && <SaveGameButton disabled={!canSave} onClick={onSave} />}
            <IonButton
              fill="clear"
              data-testid={SETTINGS_OPEN_TESTID}
              aria-label="Settings"
              onClick={() => setSettingsOpen(true)}
            >
              <span aria-hidden="true">⚙</span>
            </IonButton>
            <ThemeToggle />
          </div>
        </IonToolbar>
      </IonHeader>

      {/*
        Puzzles replace the board rather than sitting beside it: they are a different game
        with a different goal, and a position from the mined set has nothing to do with the
        game in progress. Switching back leaves that game untouched.
      */}
      {screen === 'puzzles' ? (
        <PuzzleScreen
          puzzles={puzzlesInPlayOrder()}
          startIndex={puzzleIndexFromUrl()}
          autoSubmit={settings.autoSubmit}
        />
      ) : screen === 'watch' ? (
        /* Both sides play the ruleset the URL carries, at one strength: an uneven match
           would measure the handicap rather than the game (`self-play-harness.md` §1). */
        <SelfPlayScreen rules={state.rules} difficulty={difficulty} />
      ) : (
        <>
          <BoardView
            state={state}
            status={status}
            onMove={onMove}
            locked={boardLocked}
            autoSubmit={settings.autoSubmit}
          />
          <footer className="footer">
            <p role="status" aria-live="polite" data-testid={GAME_STATUS_TESTID}>
              <strong>{describeStatus(status, state.turn)}</strong>
            </p>
          </footer>
          <OpponentControls
            engineSide={engineSide}
            onEngineSideChange={setEngineSide}
            difficulty={difficulty}
            onDifficultyChange={setDifficulty}
            thinking={engine.thinking}
            reachedDepth={engine.reachedDepth}
            error={engine.error}
          />
          <section className="saves">
            <SavedGamesList items={savedGames} onLoad={onLoadSaved} onDelete={onDeleteSaved} onRename={onRenameSaved} />
          </section>
        </>
      )}
    </div>
  )
}



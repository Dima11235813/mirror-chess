import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { IonButton } from '@ionic/react'
import { BoardView } from '@components/BoardView'
import { ReservedText } from '@components/ReservedText/ReservedText'
import { initialPosition } from '@game/setup'
import { reduceMove } from '@game/reducer'
import { gameStatus, isGameOver } from '@game/status'
import { algebraic } from '@game/coord'
import { rootDiagnostics } from '@engine/diagnostics'
import { EngineClient } from '@engine/host/engine-client'
import { difficultyById } from '@engine/host/levels'
import { describeStatus } from '@shared/ui/status-text'
import {
  WATCH_SCREEN_TESTID,
  WATCH_PLAY_TESTID,
  WATCH_STEP_TESTID,
  WATCH_RESET_TESTID,
  WATCH_STATUS_TESTID,
  WATCH_LOG_TESTID,
  WATCH_GAUGE_TESTID,
} from '@shared/ui/selectors'
import type { GameState, Move } from '@game/types'
import type { SelfPlayScreenProps, ThinkFn, WatchedMove } from './SelfPlayScreen.types'

/**
 * WATCH TWO ENGINES PLAY — `prj-mgmt/epics/balance/watch-a-game.md`.
 *
 * **What is this?** A screen where the engine plays both sides of one game, a move at a
 * time, showing what it scored, how deep it got, the line it expected, and how many legal
 * moves its evaluation could not tell apart.
 *
 * **Why is it here?** Because the project's blocker is that the evaluation does not
 * discriminate, and until now that was a sentence in a document. Self-play opens
 * `b1c3 a7a6 a1b1 a6a5 b1a1 a5a4` — a rook shuffling — identically under all 64 rulesets.
 * This screen shows that happening, and the gauge at the top turns it into a number that
 * will visibly fall when the evaluation starts working.
 *
 * **How does it work?** A loop in an effect: while running and the game is not over, ask
 * the engine for a move, apply it with `reduceMove`, record a row, repeat. The engine runs
 * on a Web Worker, so the page stays responsive while it thinks.
 *
 * **What is subtle?** Three things, each of which has bitten this repo before:
 *
 * 1. **`reduceMove`, never `advancePosition`.** The latter deliberately maintains only what
 *    decides legality — no halfmove clock, no repetition history — so a game advanced with
 *    it never ends and the loop runs forever (`readiness-probe.md` §5).
 * 2. **Pause takes effect between moves, not during one.** A search in flight is allowed to
 *    finish and is then discarded if the screen moved on, which is what the `generation`
 *    counter is for. Cancelling mid-search would leave the worker's reply to race the reset.
 * 3. **The engine plays both sides at the same strength.** A game where one side searches
 *    deeper measures the handicap, not the variant.
 */
export function SelfPlayScreen(props: SelfPlayScreenProps) {
  const { rules, difficulty, autoPlay = false } = props

  const [state, setState] = useState<GameState>(() => initialPosition(rules))
  const [log, setLog] = useState<readonly WatchedMove[]>([])
  const [running, setRunning] = useState(autoPlay)
  const [thinking, setThinking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** Bumped on reset, so a search still in flight cannot apply its move to a new game. */
  const generation = useRef(0)
  /** One step requested while paused. */
  const [pendingStep, setPendingStep] = useState(0)

  const clientRef = useRef<EngineClient | null>(null)
  const think = useMemo<ThinkFn>(() => {
    if (props.think) return props.think
    return async (position, level) => {
      if (!clientRef.current) clientRef.current = new EngineClient()
      const result = await clientRef.current.think(position, difficultyById(level))
      return result && { ...result, pv: [] }
    }
  }, [props.think])

  useEffect(() => () => clientRef.current?.dispose(), [])

  const status = gameStatus(state)
  const over = isGameOver(status)
  const diagnostics = useMemo(() => rootDiagnostics(state), [state])

  /** Play exactly one move. Shared by the run loop and the step button. */
  const playOne = useCallback(async () => {
    const era = generation.current
    const from = state
    setThinking(true)
    try {
      const found = await think(from, difficulty)
      if (era !== generation.current || !found?.move) return
      const move: Move = found.move
      const before = rootDiagnostics(from)

      setLog(rows => [...rows, {
        ply: rows.length + 1,
        move,
        coordinate: `${algebraic(move.from)}-${algebraic(move.to)}${move.crossedSeam ? '*' : ''}`,
        score: found.score,
        depth: found.depth,
        nodes: found.nodes,
        elapsedMs: found.elapsedMs,
        pv: (found.pv ?? []).map(m => `${algebraic(m.from)}-${algebraic(m.to)}`),
        legalMoves: before.legalMoves,
        indistinguishable: before.indistinguishable,
      }])
      setState(reduceMove(from, move))
    } catch (reason) {
      if (era === generation.current) {
        setError(reason instanceof Error ? reason.message : String(reason))
        setRunning(false)
      }
    } finally {
      if (era === generation.current) setThinking(false)
    }
  }, [state, think, difficulty])

  // The loop. Re-entered after every applied move, because `state` changed.
  useEffect(() => {
    if (over || thinking) return
    if (!running && pendingStep === 0) return
    if (pendingStep > 0) setPendingStep(n => n - 1)
    void playOne()
    // `playOne` closes over `state`; depending on it here would re-fire mid-search.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, pendingStep, over, thinking, state])

  const onReset = () => {
    generation.current++
    setRunning(false)
    setPendingStep(0)
    setThinking(false)
    setError(null)
    setLog([])
    setState(initialPosition(rules))
  }

  const gauge = diagnostics.legalMoves > 0
    ? `${diagnostics.indistinguishable} of ${diagnostics.legalMoves} moves indistinguishable`
    : 'no legal moves'

  return (
    <section className="selfPlay" data-testid={WATCH_SCREEN_TESTID}>
      {/*
        A constant string. It used to read `Engine vs engine · ${describeStatus(…)}`, which
        wrapped to two lines on a phone for the longer statuses and so moved the board —
        and the status was already shown, unabbreviated, in the live region below the
        board. A duplicate that changes height is worse than no duplicate.
      */}
      <h2 className="selfPlayTitle">Engine vs engine</h2>

      {/*
        The gauge, and the honest sentence under it. This screen's value today is that it
        does not dress up what it is showing: two engines that cannot tell quiet moves
        apart. When the evaluation starts working, this number falls and the sentence
        changes to say so.

        The sentence is **always present**, which is the fix rather than the dressing: it
        used to render only while moves were tied, and `indistinguishable` crosses that
        threshold on most moves, so a three-line block above the board appeared and
        disappeared several times a second. A reserve alone would have padded over a
        conditional; stating both outcomes removes it.
      */}
      <ReservedText
        lines={3}
        as="p"
        label="the engine's note"
        wrapperClassName="selfPlayGaugeSlot"
        className="selfPlayGauge"
        testId={WATCH_GAUGE_TESTID}
      >
        <strong>{gauge}</strong>
        <span className="selfPlayHint">{' '}{gaugeNote(diagnostics.legalMoves, diagnostics.indistinguishable)}</span>
      </ReservedText>

      <BoardView state={state} status={status} onMove={() => {}} locked />

      <div className="selfPlayControls">
        <IonButton data-testid={WATCH_PLAY_TESTID} onClick={() => setRunning(r => !r)} disabled={over}>
          {running ? 'Pause' : 'Play'}
        </IonButton>
        <IonButton
          data-testid={WATCH_STEP_TESTID}
          onClick={() => setPendingStep(n => n + 1)}
          disabled={over || running}
        >
          Step
        </IonButton>
        <IonButton data-testid={WATCH_RESET_TESTID} onClick={onReset}>Reset</IonButton>
      </div>

      <p role="status" aria-live="polite" data-testid={WATCH_STATUS_TESTID}>
        {error ? `Engine error: ${error}` : thinking ? 'Thinking…' : describeStatus(status, state.turn)}
      </p>

      <h3 className="visually-hidden">Moves played, with the engine&apos;s reasoning</h3>
      <ol className="selfPlayLog" data-testid={WATCH_LOG_TESTID}>
        {log.map(row => (
          <li key={row.ply}>
            <span className="selfPlayMove">{row.coordinate}</span>
            {' '}
            <span className="selfPlayScore">{(row.score / 100).toFixed(2)}</span>
            {' · '}
            <span>depth {row.depth}</span>
            {' · '}
            <span>{row.nodes.toLocaleString()} nodes</span>
            {' · '}
            <span>{row.indistinguishable}/{row.legalMoves} tied</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

/**
 * What the gauge's number means, in a sentence.
 *
 * **All three branches return text**, and that is the design rather than an oversight.
 * The sentence used to appear only while the evaluation was indifferent, which is a
 * condition that flips on most moves — so a block above the board grew and shrank several
 * times a second and the board moved with it
 * (`prj-mgmt/epics/quality/layout-shift.md`). Reserving space for a conditional block
 * hides that; saying something in every state removes it, and the states are all worth
 * saying out loud on a screen whose purpose is to be honest about the evaluation.
 *
 * They are deliberately close in length, because the reserved region is sized for the
 * longest of them.
 *
 * @param legalMoves How many moves the side to move has.
 * @param indistinguishable How many of them the evaluation scores identically.
 */
function gaugeNote(legalMoves: number, indistinguishable: number): string {
  if (legalMoves === 0) return '— the game is over, so there is nothing left to choose between.'
  if (indistinguishable > 1) {
    return '— the evaluation has no preference here, so the move is chosen by search depth alone.'
  }
  return '— the evaluation singles one move out here, which is what it is supposed to do.'
}

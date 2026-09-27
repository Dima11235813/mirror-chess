import type { Color } from '@game/types'
import { DIFFICULTIES, type DifficultyId } from '@engine/host/levels'
import {
  ENGINE_STATUS_TESTID,
  OPPONENT_DIFFICULTY_TESTID,
  OPPONENT_SIDE_TESTID,
} from '@shared/ui/selectors'

export interface OpponentControlsProps {
  /** Which colour the engine plays, or `null` for two humans at one board. */
  readonly engineSide: Color | null
  readonly onEngineSideChange: (side: Color | null) => void
  readonly difficulty: DifficultyId
  readonly onDifficultyChange: (difficulty: DifficultyId) => void
  readonly thinking: boolean
  readonly reachedDepth: number | null
  readonly error: string | null
}

/** The choices, in the order a player reads them. */
const SIDE_OPTIONS: readonly { readonly value: string; readonly label: string }[] = [
  { value: 'none', label: 'Two players' },
  { value: 'black', label: 'Play as White' },
  { value: 'white', label: 'Play as Black' },
]

function toEngineSide(value: string): Color | null {
  return value === 'white' || value === 'black' ? value : null
}

/**
 * Choosing an opponent, and watching it think.
 *
 * Render-only. The labels are worth a note: the control is *"who am I?"*, not *"which
 * colour is the engine?"* — a player picking "Play as White" should not have to work out
 * that this means the engine takes Black. The `value` underneath is still the engine's
 * colour, because that is what the game needs.
 *
 * The thinking indicator is a live region, so a screen-reader user learns the engine is
 * working and how deep it has got. A spinner alone would tell them nothing.
 */
export function OpponentControls(props: OpponentControlsProps) {
  const { engineSide, onEngineSideChange, difficulty, onDifficultyChange } = props
  const { thinking, reachedDepth, error } = props

  return (
    <section className="opponent" aria-label="Opponent">
      <label className="opponentField">
        <span>Opponent</span>
        <select
          data-testid={OPPONENT_SIDE_TESTID}
          value={engineSide ?? 'none'}
          onChange={event => onEngineSideChange(toEngineSide(event.target.value))}
        >
          {SIDE_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>

      {engineSide !== null && (
        <label className="opponentField">
          <span>Strength</span>
          <select
            data-testid={OPPONENT_DIFFICULTY_TESTID}
            value={difficulty}
            onChange={event => onDifficultyChange(event.target.value as DifficultyId)}
          >
            {DIFFICULTIES.map(level => (
              <option key={level.id} value={level.id} title={level.blurb}>{level.name}</option>
            ))}
          </select>
        </label>
      )}

      <p className="engineStatus" role="status" aria-live="polite" data-testid={ENGINE_STATUS_TESTID}>
        {error
          ? `Engine error: ${error}`
          : thinking
            ? `Thinking${reachedDepth ? ` — depth ${reachedDepth}` : '…'}`
            : ''}
      </p>
    </section>
  )
}

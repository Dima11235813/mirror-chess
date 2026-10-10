import { useEffect, useRef } from 'react'
import type { Color, PromotionKind } from '@game/types'
import { PROMOTION_KINDS } from '@game/move'
import { PROMOTION_DIALOG_TESTID, promotionOptionTestId } from '@shared/ui/selectors'

export interface PromotionPickerProps {
  /** The square being promoted onto, in algebraic form — shown so the choice has context. */
  readonly square: string
  readonly color: Color
  readonly onChoose: (kind: PromotionKind) => void
  readonly onCancel: () => void
}

const GLYPHS: Readonly<Record<PromotionKind, readonly [string, string]>> = {
  Q: ['♕', '♛'],
  R: ['♖', '♜'],
  B: ['♗', '♝'],
  N: ['♘', '♞'],
}

const NAMES: Readonly<Record<PromotionKind, string>> = {
  Q: 'queen',
  R: 'rook',
  B: 'bishop',
  N: 'knight',
}

/**
 * Ask which piece a promoting pawn becomes.
 *
 * All four are offered, always, as every chess interface should. The reason written here
 * until 2026-10-03 — that a lone bishop is mating material in this variant, so
 * under-promoting to one can win a game a knight cannot — **was true of the old seam
 * crossing and is not any more**: a crossing now preserves square colour, bishops are
 * colour-bound as in chess, and `draw-rules.ts` was re-enumerated to match
 * (`prj-mgmt/epics/rules/diagonal-crossing.md`). What survives is smaller and still real:
 * a promoted bishop attacks the far side of the board immediately, since its rays wrap.
 *
 * Render-only: it knows nothing about legality. The board has already established that
 * this move is legal in all four forms — a promotion is generated as four distinct moves
 * (spec §13.1) — so every button here leads somewhere valid.
 */
export function PromotionPicker({ square, color, onChoose, onCancel }: PromotionPickerProps) {
  const firstOption = useRef<HTMLButtonElement>(null)

  // Move focus into the dialog so a keyboard user is not left behind on the board.
  useEffect(() => { firstOption.current?.focus() }, [])

  return (
    <div className="promotionBackdrop" onClick={onCancel}>
      <div
        className="promotionPicker"
        role="dialog"
        aria-modal="true"
        aria-label={`Promote pawn on ${square}`}
        data-testid={PROMOTION_DIALOG_TESTID}
        onClick={event => event.stopPropagation()}
        onKeyDown={event => { if (event.key === 'Escape') onCancel() }}
      >
        <p className="promotionPrompt">Promote to</p>
        <div className="promotionOptions">
          {PROMOTION_KINDS.map((kind, index) => (
            <button
              key={kind}
              ref={index === 0 ? firstOption : undefined}
              type="button"
              className="promotionOption"
              aria-label={`Promote to ${NAMES[kind]}`}
              data-testid={promotionOptionTestId(kind)}
              onClick={() => onChoose(kind)}
            >
              <span aria-hidden="true">{GLYPHS[kind][color === 'white' ? 0 : 1]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

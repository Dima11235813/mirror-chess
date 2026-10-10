import { useEffect, useId, useRef, useState } from 'react'
import {
  RESERVED_TEXT_BODY_CLASS as BODY_CLASS,
  RESERVED_TEXT_CLASS,
  RESERVED_TEXT_MORE_CLASS,
} from '@shared/ui/selectors'
import type { OverflowProbe, ReservedTextProps } from './ReservedText.types'

/**
 * The real overflow question: is the content taller than the box we are showing?
 *
 * `+ 1` because sub-pixel line heights make `scrollHeight` exceed `clientHeight` by a
 * fraction on text that visibly fits, which would show a disclosure that reveals nothing.
 */
const overflowsItsBox: OverflowProbe = element =>
  element.scrollHeight > element.clientHeight + 1

/**
 * A BLOCK OF TEXT THAT NEVER CHANGES THE PAGE'S HEIGHT —
 * `prj-mgmt/epics/quality/layout-shift.md`.
 *
 * **What is this?** A region that holds a fixed number of lines of space, clamps anything
 * longer, and offers a disclosure to read the rest. Its box is the same height whatever is
 * inside it, including when nothing is.
 *
 * **Why is it here?** Because the watch screen shipped a sentence above the board that
 * renders one line for some positions and three for others, so the board — the thing a
 * thumb is aiming at — jumped several times a second, and on a phone the controls below it
 * were pushed off the screen entirely. That is not a bug in one sentence; it is what
 * *any* variable-height block above the primary content does.
 *
 * **How does it work?** The wrapper reserves `lines × line-height` and the text is clamped
 * to the same count, so the two agree by construction — a reserve written in `px` next to
 * a clamp written in lines is a pair that drifts. When the clamp bites, a disclosure
 * button appears and expanding **overlays** the text on what follows rather than reflowing
 * it, because text that expands by pushing the board down has only traded one shift for a
 * worse one.
 *
 * **What is subtle?** Three things:
 *
 * 1. **The children are always in the DOM in full.** Clamping is visual only, so a live
 *    region announces the whole sentence and a screen-reader user never needs the
 *    disclosure at all. It exists for eyes.
 * 2. **Measurement stops while expanded.** An expanded body is not clamped, so it does not
 *    overflow, so re-measuring would conclude "it fits" and remove the control the player
 *    is currently using.
 * 3. **The disclosure is positioned absolutely.** A control that took part in layout would
 *    change the height of the box whose job is not to change height — and, appearing from a
 *    `ResizeObserver`, could feed itself.
 */
export function ReservedText({
  lines,
  label,
  as = 'p',
  className,
  wrapperClassName,
  testId,
  live = false,
  measure = overflowsItsBox,
  children,
}: ReservedTextProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [overflowing, setOverflowing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const bodyId = useId()

  useEffect(() => {
    if (expanded) return
    const wrap = wrapRef.current
    const body = wrap?.querySelector<HTMLElement>(`.${BODY_CLASS}`)
    if (!wrap || !body) return

    const remeasure = () => setOverflowing(measure(body))
    remeasure()
    // The width decides how many lines the text takes, so a rotation or a window drag can
    // start or stop the overflow without the text changing at all.
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(remeasure)
    observer.observe(wrap)
    return () => observer.disconnect()
  }, [children, expanded, measure])

  const Body = as

  return (
    <div
      ref={wrapRef}
      className={`${RESERVED_TEXT_CLASS}${expanded ? ' expanded' : ''}${wrapperClassName ? ` ${wrapperClassName}` : ''}`}
      style={{ ['--reserved-lines' as string]: lines }}
      onKeyDown={event => { if (event.key === 'Escape' && expanded) setExpanded(false) }}
    >
      <Body
        id={bodyId}
        className={`${BODY_CLASS}${className ? ` ${className}` : ''}`}
        {...(testId ? { 'data-testid': testId } : {})}
        {...(live ? { role: 'status', 'aria-live': 'polite' as const } : {})}
      >
        {children}
      </Body>
      {overflowing && (
        <button
          type="button"
          className={RESERVED_TEXT_MORE_CLASS}
          aria-expanded={expanded}
          aria-controls={bodyId}
          aria-label={expanded ? `Hide the rest of ${label}` : `Show all of ${label}`}
          onClick={() => setExpanded(open => !open)}
        >
          {expanded ? 'less' : '…more'}
        </button>
      )}
    </div>
  )
}

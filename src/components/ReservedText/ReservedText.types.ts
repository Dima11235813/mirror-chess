import type { ReactNode } from 'react'

/**
 * Does this element have more content than its box shows?
 *
 * Injected rather than hard-coded for the same reason `SelfPlayScreen` takes its `think`
 * as a prop: **jsdom has no layout**, so `scrollHeight` and `clientHeight` are both `0`
 * there and the real probe can only ever answer "it fits". A test that wants the
 * overflowing branch has to be able to say so.
 */
export type OverflowProbe = (element: HTMLElement) => boolean

/** Which element the text itself is rendered as. The reserve around it is always a `div`. */
export type ReservedTextTag = 'p' | 'h2' | 'h3' | 'div'

export interface ReservedTextProps {
  /**
   * How many lines of space to hold, whatever the content turns out to be.
   *
   * Size it for the **longest reasonable content**, not the common case: the whole point
   * is that the box does not change, so a reserve that the text sometimes exceeds has
   * only moved the problem to the overflow path.
   */
  readonly lines: 1 | 2 | 3 | 4
  /**
   * What the region is, for the disclosure button's accessible name — a noun phrase that
   * reads after "Show all of": `"the engine's note"`, `"the puzzle's details"`.
   */
  readonly label: string
  /** Element for the text. Use a heading when the text *is* the screen's heading. */
  readonly as?: ReservedTextTag
  /**
   * Announce changes to the text, for a region that appears in response to an action
   * (CLAUDE.md §7).
   *
   * The live region goes on the **text**, never on the wrapper, and the disclosure button
   * sits outside it. That is the whole reason this is a prop rather than something a
   * caller wraps around the component: a live region containing the button would announce
   * the word "more" as part of the message.
   */
  readonly live?: boolean
  /** Classes for the text element, so existing per-screen styling keeps applying. */
  readonly className?: string
  /**
   * Classes for the reserved box around the text — where **width** belongs.
   *
   * The two are separate because the box and the text want different things: the box is
   * what the disclosure button is positioned against, so it has to be exactly as wide as
   * the text is allowed to be, or the control lands somewhere the text is not.
   */
  readonly wrapperClassName?: string
  /** Test id for the text element — deliberately not the wrapper, so selectors keep working. */
  readonly testId?: string
  readonly measure?: OverflowProbe
  readonly children: ReactNode
}

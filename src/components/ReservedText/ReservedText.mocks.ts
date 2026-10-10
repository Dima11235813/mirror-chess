import type { OverflowProbe } from './ReservedText.types'

/**
 * Overflow probes for a world with no layout.
 *
 * jsdom reports `scrollHeight === clientHeight === 0` for everything, so the real probe
 * can only ever answer "it fits" and the disclosure branch would be untestable. These
 * state the answer instead — the same trick as `SelfPlayScreen.mocks.ts` injecting an
 * engine where there is no `Worker`.
 */
export const alwaysFits: OverflowProbe = () => false

export const alwaysOverflows: OverflowProbe = () => true

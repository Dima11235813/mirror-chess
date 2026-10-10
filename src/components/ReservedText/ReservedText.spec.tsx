import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ReservedText } from './ReservedText'
import { alwaysFits, alwaysOverflows } from './ReservedText.mocks'

/**
 * Story: `prj-mgmt/epics/quality/layout-shift.md`.
 *
 * These prove the **behaviour** — what is in the DOM, what is announced, what a tap does.
 * They cannot prove the geometry, because jsdom has no layout: "the board did not move" is
 * measured in a real browser by `prj-mgmt/epics/quality/layout-shift.e2e.ts`, and that is
 * the test that can fail for the original bug.
 */
const LONG = 'A sentence long enough that it would wrap past the space reserved for it.'

describe('ReservedText', () => {
  it('reserves the requested number of lines, so the box cannot change height', () => {
    render(
      <ReservedText lines={3} label="the note" testId="note" measure={alwaysFits}>
        short
      </ReservedText>,
    )

    // The reserve and the clamp are both driven by this one custom property, which is the
    // point: a height in px beside a clamp in lines is a pair that drifts apart.
    const wrapper = screen.getByTestId('note').parentElement!
    expect(wrapper.style.getPropertyValue('--reserved-lines')).toBe('3')
  })

  it('offers no disclosure when the text fits — a control that reveals nothing is a lie', () => {
    render(
      <ReservedText lines={2} label="the note" testId="note" measure={alwaysFits}>
        short
      </ReservedText>,
    )

    expect(screen.queryByRole('button')).toBeNull()
  })

  it('offers a disclosure when the text is clamped, and names what it will show', () => {
    render(
      <ReservedText lines={1} label="the engine's note" testId="note" measure={alwaysOverflows}>
        {LONG}
      </ReservedText>,
    )

    const toggle = screen.getByRole('button', { name: "Show all of the engine's note" })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    // It says which region it expands, so the relationship survives being read out of order.
    expect(toggle.getAttribute('aria-controls')).toBe(screen.getByTestId('note').id)
  })

  it('expands on a tap and collapses again, keeping the control throughout', () => {
    render(
      <ReservedText lines={1} label="the engine's note" testId="note" measure={alwaysOverflows}>
        {LONG}
      </ReservedText>,
    )

    fireEvent.click(screen.getByRole('button'))
    // Not `queryByRole(...)` afterwards: an expanded body is no longer clamped, so a
    // re-measure would conclude "it fits" and take away the control being used. The
    // component stops measuring while open, and this is the assertion that pins it.
    const toggle = screen.getByRole('button', { name: "Hide the rest of the engine's note" })
    expect(toggle.getAttribute('aria-expanded')).toBe('true')

    fireEvent.click(toggle)
    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('false')
  })

  it('closes on Escape, because a thing opened by a thumb needs a way back', () => {
    render(
      <ReservedText lines={1} label="the note" testId="note" measure={alwaysOverflows}>
        {LONG}
      </ReservedText>,
    )

    fireEvent.click(screen.getByRole('button'))
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Escape' })

    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('false')
  })

  it('keeps the whole text in the DOM while clamped, so a live region still says all of it', () => {
    // The clamp is visual. A screen-reader user should never need the disclosure, which is
    // why this is the assertion that matters most on the accessibility side.
    render(
      <ReservedText lines={1} label="the note" testId="note" measure={alwaysOverflows}>
        {LONG}
      </ReservedText>,
    )

    expect(screen.getByTestId('note').textContent).toBe(LONG)
  })

  it('renders as the element the screen needs, so a heading stays a heading', () => {
    render(
      <ReservedText lines={2} as="h2" label="the prompt" testId="prompt" measure={alwaysFits}>
        White to play
      </ReservedText>,
    )

    expect(screen.getByRole('heading', { level: 2 }).getAttribute('data-testid')).toBe('prompt')
  })
})

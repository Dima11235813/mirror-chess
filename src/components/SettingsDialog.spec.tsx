import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SettingsDialog } from './SettingsDialog'
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '@shared/settings'
import {
  SETTINGS_DIALOG_TESTID,
  SETTINGS_AUTOSUBMIT_TESTID,
  SETTINGS_RESET_TESTID,
  SETTINGS_CLOSE_TESTID,
} from '@shared/ui/selectors'

/**
 * Stories: `submit-mode.md` (the toggle) and `persist-settings.md` (that it survives).
 */
describe('SettingsDialog', () => {
  beforeEach(() => { window.localStorage.clear() })

  it('is a labelled modal dialog, and puts focus inside itself', () => {
    // Opening a dialog and leaving focus behind on the page is the classic version of
    // this bug — a keyboard user is then tabbing around a thing they cannot see.
    render(<SettingsDialog settings={DEFAULT_SETTINGS} onChange={() => {}} onClose={() => {}} />)

    const dialog = screen.getByTestId(SETTINGS_DIALOG_TESTID)
    expect(dialog.getAttribute('role')).toBe('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('aria-label')).toBe('Settings')
    expect(document.activeElement).toBe(screen.getByTestId(SETTINGS_AUTOSUBMIT_TESTID))
  })

  it('reflects the current setting rather than assuming the default', () => {
    render(<SettingsDialog settings={{ autoSubmit: false }} onChange={() => {}} onClose={() => {}} />)

    expect((screen.getByTestId(SETTINGS_AUTOSUBMIT_TESTID) as HTMLInputElement).checked).toBe(false)
  })

  it('reports a change immediately — there is no OK button to forget to press', () => {
    const onChange = vi.fn()
    render(<SettingsDialog settings={DEFAULT_SETTINGS} onChange={onChange} onClose={() => {}} />)

    fireEvent.click(screen.getByTestId(SETTINGS_AUTOSUBMIT_TESTID))

    expect(onChange).toHaveBeenCalledWith({ autoSubmit: false })
  })

  it('resets to the defaults', () => {
    const onChange = vi.fn()
    render(<SettingsDialog settings={{ autoSubmit: false }} onChange={onChange} onClose={() => {}} />)

    fireEvent.click(screen.getByTestId(SETTINGS_RESET_TESTID))

    expect(onChange).toHaveBeenCalledWith(DEFAULT_SETTINGS)
  })

  it('closes on the button, on Escape, and on the backdrop', () => {
    const onClose = vi.fn()
    const { container } = render(
      <SettingsDialog settings={DEFAULT_SETTINGS} onChange={() => {}} onClose={onClose} />,
    )

    fireEvent.click(screen.getByTestId(SETTINGS_CLOSE_TESTID))
    fireEvent.keyDown(screen.getByTestId(SETTINGS_DIALOG_TESTID), { key: 'Escape' })
    fireEvent.click(container.querySelector('.promotionBackdrop')!)

    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('does not close when the dialog itself is clicked', () => {
    // The backdrop closes; the panel on top of it must not, or every toggle shuts it.
    const onClose = vi.fn()
    render(<SettingsDialog settings={DEFAULT_SETTINGS} onChange={() => {}} onClose={onClose} />)

    fireEvent.click(screen.getByTestId(SETTINGS_DIALOG_TESTID))

    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('settings persistence', () => {
  beforeEach(() => { window.localStorage.clear() })

  it('survives a reload, which is the whole of persist-settings.md', () => {
    expect(loadSettings()).toEqual({ autoSubmit: true })

    saveSettings({ autoSubmit: false })

    expect(loadSettings()).toEqual({ autoSubmit: false })
  })

  it('falls back to the defaults when storage holds nonsense', () => {
    // Hand-edited in devtools, or written by a version that does not exist yet.
    window.localStorage.setItem('mirror-chess:settings:v1', '{not json')

    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })
})

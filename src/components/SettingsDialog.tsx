import { useEffect, useRef } from 'react'
import {
  SETTINGS_DIALOG_TESTID,
  SETTINGS_AUTOSUBMIT_TESTID,
  SETTINGS_RESET_TESTID,
  SETTINGS_CLOSE_TESTID,
} from '@shared/ui/selectors'
import { DEFAULT_SETTINGS, type Settings } from '@shared/settings'

export interface SettingsDialogProps {
  readonly settings: Settings
  readonly onChange: (next: Settings) => void
  readonly onClose: () => void
}

/**
 * The settings dialog.
 *
 * Stories: `prj-mgmt/epics/user-moves/submit-move/submit-mode.md` and
 * `prj-mgmt/epics/board-interactions/customization/persist-settings.md`.
 *
 * **Render-only, and it owns nothing.** The shell holds the settings and persists them;
 * this asks for changes. That is what lets the same dialog be opened from any screen and
 * tested without touching `localStorage`.
 *
 * **Changes apply immediately** — there is no OK button, only Close. A settings panel that
 * needs saving is a panel that can be half-saved, and `persist-settings.md` asks for a
 * change to survive from the moment it is made.
 *
 * Modelled on `PromotionPicker`: same backdrop, same focus-on-open, same Escape handling.
 * Two dialogs that behave differently is a worse outcome than a little repetition.
 */
export function SettingsDialog({ settings, onChange, onClose }: SettingsDialogProps) {
  const firstControl = useRef<HTMLInputElement>(null)

  // Move focus into the dialog, so a keyboard user is not left behind on the page.
  useEffect(() => { firstControl.current?.focus() }, [])

  return (
    <div className="promotionBackdrop" onClick={onClose}>
      <div
        className="settingsDialog"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        data-testid={SETTINGS_DIALOG_TESTID}
        onClick={event => event.stopPropagation()}
        onKeyDown={event => { if (event.key === 'Escape') onClose() }}
      >
        <h2 className="settingsTitle">Settings</h2>

        <label className="settingsRow">
          <input
            ref={firstControl}
            type="checkbox"
            data-testid={SETTINGS_AUTOSUBMIT_TESTID}
            checked={settings.autoSubmit}
            onChange={event => onChange({ ...settings, autoSubmit: event.target.checked })}
          />
          <span>
            <strong>Play moves immediately</strong>
            <small>
              Off: choose a square, then press <em>Submit move</em> to play it. Useful on a
              phone, where a stray tap is a move.
            </small>
          </span>
        </label>

        <div className="settingsActions">
          <button
            type="button"
            className="settingsReset"
            data-testid={SETTINGS_RESET_TESTID}
            onClick={() => onChange(DEFAULT_SETTINGS)}
          >
            Reset to defaults
          </button>
          <button
            type="button"
            className="settingsClose"
            data-testid={SETTINGS_CLOSE_TESTID}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

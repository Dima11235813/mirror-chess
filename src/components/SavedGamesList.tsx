import type { SavedGameMeta } from '../shared/persistence'

export interface SavedGamesListProps {
  readonly items: readonly SavedGameMeta[]
  readonly onLoad: (id: string) => void
  readonly onDelete?: (id: string) => void
}

/** Pure list: renders provided items, delegates interactions via callbacks. */
export function SavedGamesList({ items, onLoad, onDelete }: SavedGamesListProps) {
  if (items.length === 0) {
    return <div aria-live="polite" data-testid="saves-empty">No saved games</div>
  }
  return (
    <ul className="saved-games" aria-label="Saved games" data-testid="saved-games-list">
      {items.map(item => (
        <li key={item.id} className="saved-game">
          <div className="meta">
            <span className="turn">Turn: <strong>{item.turn}</strong></span>
            <span className="time" aria-label="Saved at">{new Date(item.savedAt).toLocaleString()}</span>
          </div>
          <div className="actions">
            <button onClick={() => onLoad(item.id)} data-testid={`load-${item.id}`}>Load</button>
            {onDelete && (
              <button onClick={() => onDelete(item.id)} aria-label="Delete save" data-testid={`delete-${item.id}`}>Delete</button>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}



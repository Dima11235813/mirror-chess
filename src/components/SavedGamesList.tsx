import { useEffect, useMemo, useRef, useState } from 'react';
import type { SavedGameMeta } from '@shared/persistence';
import type { SavedGameRowProps } from '@shared/persistence/types';

export interface SavedGamesListProps {
  readonly items: readonly SavedGameMeta[];
  readonly onLoad: (id: string) => void;
  readonly onDelete?: (id: string) => void;
  readonly onRename?: (id: string, name: string) => void;
}

/** Pure list: renders provided items, delegates interactions via callbacks. */
export function SavedGamesList({ items, onLoad, onDelete, onRename }: SavedGamesListProps) {
  if (items.length === 0) {
    return (
      <div aria-live="polite" data-testid="saves-empty">
        No saved games
      </div>
    );
  }
  return (
    <ul className="saved-games" aria-label="Saved games" data-testid="saved-games-list">
      {items.map((item) => (
        <SavedGameRow
          key={item.id}
          item={item}
          onLoad={onLoad}
          {...(onDelete ? { onDelete } : {})}
          {...(onRename ? { onRename } : {})}
        />
      ))}
    </ul>
  );
}

function SavedGameRow({ item, onLoad, onDelete, onRename }: SavedGameRowProps) {
  const [name, setName] = useState<string>(item.name ?? '');
  const timer = useRef<number | null>(null);

  // Reset local name if list refreshes with different value
  useEffect(() => {
    setName(item.name ?? '');
  }, [item.id, item.name]);

  const debouncedRename = useMemo(
    () => (value: string) => {
      if (!onRename) return;
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
      }
      timer.current = window.setTimeout(() => {
        onRename(item.id, value);
        timer.current = null;
      }, 400);
    },
    [item.id, onRename],
  );

  return (
    <li className="saved-game">
      <div className="meta">
        <input
          type="text"
          placeholder="Name this game…"
          value={name}
          onChange={(e) => {
            const v = e.currentTarget.value;
            setName(v);
            debouncedRename(v);
          }}
          aria-label="Saved game name"
          data-testid={`name-${item.id}`}
          minLength={3}
          maxLength={200}
        />
        <span className="turn">
          Turn: <strong>{item.turn}</strong>
        </span>
        <span className="time" aria-label="Saved at">
          {new Date(item.savedAt).toLocaleString()}
        </span>
      </div>
      <div className="actions">
        <button onClick={() => onLoad(item.id)} data-testid={`load-${item.id}`}>
          Load
        </button>
        {onDelete && (
          <button
            onClick={() => onDelete(item.id)}
            aria-label="Delete save"
            data-testid={`delete-${item.id}`}
          >
            Delete
          </button>
        )}
      </div>
    </li>
  );
}

import type { SavedGameMeta } from '@shared/persistence';

/**
 * Props contract for UI that renders a single saved game row.
 *
 * - Keep callbacks UI-agnostic: they operate on the saved game `id` only.
 * - This interface is shared so multiple components can render/act on saved games consistently.
 */
export interface SavedGameRowProps {
  readonly item: SavedGameMeta;
  readonly onLoad: (id: string) => void;
  readonly onDelete?: (id: string) => void;
  readonly onRename?: (id: string, name: string) => void;
}



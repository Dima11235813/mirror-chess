
import type { SavedGameMeta } from '@shared/persistence';
import type { SavedGameRowProps } from '@shared/persistence/types';
import { useEffect, useMemo, useRef, useState } from 'react';
import { IonicButton, IonicInput } from '@components/ionic';
import { 
  IonCard, 
  IonCardContent, 
  IonItem, 
  IonLabel, 
  IonText, 
  IonBadge, 
  IonIcon, 
  IonGrid, 
  IonRow, 
  IonCol,
  IonChip,
  IonToggle
} from '@ionic/react';
import { 
  timeOutline, 
  gameControllerOutline, 
  trashOutline, 
  downloadOutline,
  saveOutline,
  cloudUploadOutline
} from 'ionicons/icons';
import { getAllSavedGames, generateGamesExportFilename, saveGame } from '@shared/persistence';
import type { GameState } from '@game/types';

export interface SavedGamesListProps {
  readonly items: readonly SavedGameMeta[];
  readonly onLoad: (id: string) => void;
  readonly onDelete?: (id: string) => void;
  readonly onRename?: (id: string, name: string) => void;
  readonly onRefresh?: () => void; // Callback to refresh the list after upload
}

/** Pure list: renders provided items, delegates interactions via callbacks. */
export function SavedGamesList({ items, onLoad, onDelete, onRename, onRefresh }: SavedGamesListProps) {
  const [isVisible, setIsVisible] = useState(false);

  if (items.length === 0) {
    return (
      <div aria-live="polite" data-testid="saves-empty">
        No saved games
      </div>
    );
  }

  const handleToggleChange = (event: CustomEvent) => {
    setIsVisible(event.detail.checked);
  };

  const handleDownloadGames = () => {
    const gamesData = getAllSavedGames();
    const filename = generateGamesExportFilename();
    
    // Create and download the JSON file
    const blob = new Blob([JSON.stringify(gamesData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleUploadGames = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.multiple = false;
    
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const gamesData = JSON.parse(content) as unknown;
          
          if (Array.isArray(gamesData)) {
            let importedCount = 0;
            
            for (const game of gamesData) {
              if (game && typeof game === 'object' && 'state' in game && 'name' in game) {
                try {
                  saveGame(game.state as GameState, game.name as string);
                  importedCount++;
                } catch (error) {
                  console.warn('Failed to import game:', game.name, error);
                }
              }
            }
            
            if (importedCount > 0) {
              // Refresh the list to show imported games
              onRefresh?.();
            }
          }
        } catch (error) {
          console.error('Failed to parse uploaded file:', error);
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  };

  return (
    <div className="saved-games-section" data-testid="saved-games-list">
      {/* Header with toggle for visibility */}
      <IonItem className="saved-games-header">
        <IonIcon icon={saveOutline} slot="start" />
        <IonLabel>Saved Games ({items.length})</IonLabel>
        <IonToggle
          checked={isVisible}
          onIonChange={handleToggleChange}
          aria-label="Toggle saved games visibility"
          color="primary"
          enableOnOffLabels={true}
          labelPlacement="end"
          justify="space-between"
        />
      </IonItem>
      
      {/* Content that shows/hides based on toggle state */}
      {isVisible && (
        <div className="saved-games-content">
          {items.map((item) => (
            <SavedGameRow
              key={item.id}
              item={item}
              onLoad={onLoad}
              {...(onDelete ? { onDelete } : {})}
              {...(onRename ? { onRename } : {})}
            />
          ))}
          
          {/* Download and Upload buttons at the bottom */}
          <div className="download-section">
            <IonicButton
              onClick={handleDownloadGames}
              size="small"
              fill="outline"
              color="medium"
              data-testid="download-games-button"
              aria-label="Download all saved games as JSON file"
            >
              <IonIcon icon={downloadOutline} slot="start" />
              Download Games List
            </IonicButton>
            
            <IonicButton
              onClick={handleUploadGames}
              size="small"
              fill="outline"
              color="primary"
              data-testid="upload-games-button"
              aria-label="Upload games from JSON file"
            >
              <IonIcon icon={cloudUploadOutline} slot="start" />
              Upload Games
            </IonicButton>
          </div>
        </div>
      )}
    </div>
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
    <IonCard className="saved-game-card">
      <IonCardContent>
        <IonGrid>
          <IonRow>
            <IonCol size="12" sizeMd="8">
              <IonItem lines="none">
                <IonicInput
                  type="text"
                  placeholder="Name this game…"
                  value={name}
                  onIonInput={(e) => {
                    const v = e.detail.value as string;
                    setName(v);
                    debouncedRename(v);
                  }}
                  aria-label="Saved game name"
                  data-testid={`name-${item.id}`}
                  minlength={3}
                  maxlength={200}
                  label="Game Name"
                  helperText="Enter a name for this saved game"
                />
              </IonItem>
            </IonCol>
            <IonCol size="6" sizeMd="2">
              <IonChip color="primary">
                <IonIcon icon={gameControllerOutline} />
                <IonLabel>Turn {item.turn}</IonLabel>
              </IonChip>
            </IonCol>
            <IonCol size="6" sizeMd="2">
              <IonChip color="medium">
                <IonIcon icon={timeOutline} />
                <IonLabel>{new Date(item.savedAt).toLocaleDateString()}</IonLabel>
              </IonChip>
            </IonCol>
          </IonRow>
        </IonGrid>
        
        <div className="actions">
          <IonicButton 
            onClick={() => onLoad(item.id)} 
            data-testid={`load-${item.id}`}
            size="large"
            fill="solid"
          >
            <IonIcon icon={downloadOutline} slot="start" />
            Load
          </IonicButton>
          {onDelete && (
            <IonicButton
              onClick={() => onDelete(item.id)}
              aria-label="Delete save"
              data-testid={`delete-${item.id}`}
              size="large"
              fill="outline"
              color="danger"
            >
              <IonIcon icon={trashOutline} slot="start" />
              Delete
            </IonicButton>
          )}
        </div>
      </IonCardContent>
    </IonCard>
  );
}

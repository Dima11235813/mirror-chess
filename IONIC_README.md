# Ionic Integration Guide - Mirror Chess

This document explains how Ionic components and theming have been integrated into the Mirror Chess application.

## Overview

The application uses Ionic React components to provide a modern, mobile-friendly UI with built-in theme support. Ionic components are wrapped in custom components located in `src/components/ionic/` to maintain consistency and add application-specific functionality.

## Architecture

### Component Structure

```
src/components/ionic/
├── ThemeToggle.tsx      # Theme toggle component
├── useTheme.ts          # Theme management hook
└── index.ts            # Export barrel
```

### Theme System

The application implements a comprehensive theme system that:

1. **Detects system preference** - Automatically detects if the user prefers dark mode
2. **Persists user choice** - Saves theme preference in localStorage
3. **Applies to both CSS and Ionic** - Updates CSS variables and Ionic theme classes
4. **Smooth transitions** - Provides smooth theme switching animations

## Configuration

### Ionic Setup

Ionic is configured in `src/main.tsx`:

```typescript
setupIonicReact({
  mode: 'ios',        // Use iOS mode for consistent styling
  animated: true,     // Enable animations
  rippleEffect: true, // Enable ripple effects
})
```

### CSS Variables

The theme system uses CSS custom properties for consistent theming:

```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --text-primary: #212529;
  --text-secondary: #6c757d;
  --border-color: #dee2e6;
  --accent-color: #2dd4bf;
  --danger-color: #ef4444;
}

body.dark {
  --bg-primary: #1a1a1a;
  --bg-secondary: #2d2d2d;
  --text-primary: #ffffff;
  --text-secondary: #b0b0b0;
  --border-color: #404040;
}
```

## Components

### ThemeToggle

A wrapper around Ionic's `IonToggle` that provides theme switching functionality.

**Props:**
- `className?: string` - Optional CSS class

**Usage:**
```tsx
import { ThemeToggle } from '@components/ionic'

<ThemeToggle />
```

### useTheme Hook

A custom hook that manages theme state and provides theme switching functionality.

**Returns:**
- `isDark: boolean` - Current theme state
- `toggleTheme: () => void` - Function to toggle theme
- `setTheme: (isDark: boolean) => void` - Function to set specific theme

**Usage:**
```tsx
import { useTheme } from '@components/ionic'

function MyComponent() {
  const { isDark, toggleTheme } = useTheme()
  
  return (
    <button onClick={toggleTheme}>
      Current theme: {isDark ? 'Dark' : 'Light'}
    </button>
  )
}
```

## Integration Points

### App Header

The theme toggle is integrated into the main application header in `src/App.tsx`:

```tsx
<IonHeader>
  <IonToolbar>
    <IonTitle>Mirror Chess v0.1</IonTitle>
    <div className="actions">
      <IonButton onClick={onReset}>Reset</IonButton>
      <SaveGameButton disabled={!canSave} onClick={onSave} />
      <ThemeToggle />
    </div>
  </IonToolbar>
</IonHeader>
```

### Styling

The application uses a combination of:
- **CSS Variables** - For theme-specific values
- **Ionic CSS Custom Properties** - For Ionic component theming
- **CSS Transitions** - For smooth theme switching

## Theme Switching Process

1. **User Interaction** - User clicks the theme toggle
2. **State Update** - `useTheme` hook updates internal state
3. **Local Storage** - Theme preference is saved to localStorage
4. **CSS Variables** - Document body classes are updated
5. **Ionic Classes** - Ionic theme classes are applied
6. **Visual Update** - UI updates with new theme colors

## Browser Support

The theme system works in all modern browsers that support:
- CSS Custom Properties (CSS Variables)
- localStorage API
- `window.matchMedia` API

## Future Enhancements

Potential improvements to the theme system:

1. **Multiple Themes** - Support for more than just light/dark
2. **Custom Colors** - Allow users to customize accent colors
3. **System Sync** - Automatically sync with system theme changes
4. **Animation Options** - Allow users to disable transitions
5. **High Contrast** - Support for accessibility-focused themes

## Testing

To test the theme system:

1. **Manual Testing** - Click the theme toggle in the header
2. **Persistence** - Refresh the page to verify theme is saved
3. **System Preference** - Change system theme and refresh
4. **Accessibility** - Verify theme toggle has proper ARIA labels

## Dependencies

The Ionic integration requires these packages (already included):

- `@ionic/react` - Core Ionic React components
- `@ionic/react-router` - Ionic routing (if needed)
- `ionicons` - Ionic icon set

## Troubleshooting

### Theme Not Persisting

- Check browser localStorage support
- Verify localStorage is not disabled
- Check for console errors

### Theme Not Applying

- Verify CSS variables are defined
- Check Ionic theme classes are applied
- Ensure no CSS conflicts

### Performance Issues

- Theme switching is optimized with CSS transitions
- localStorage operations are minimal
- No unnecessary re-renders during theme changes

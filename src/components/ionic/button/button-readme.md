# IonicButton Component

A wrapper component for Ionic's `IonButton` that provides a consistent interface for buttons across the application with strong typing and accessibility features.

## Features

- **Type Safety**: Full TypeScript support with strict typing
- **Accessibility**: Built-in ARIA label support and semantic HTML
- **Customization**: Extensive styling options for colors, sizes, and shapes
- **Testing**: Comprehensive test coverage with mock data
- **Responsive**: Works well on different screen sizes

## Usage

```tsx
import { IonicButton } from '@components/ionic/button/IonicButton'

// Basic usage
<IonicButton>Click me</IonicButton>

// With custom styling
<IonicButton 
  color="danger" 
  size="large" 
  fill="outline"
  strong
>
  Delete Item
</IonicButton>

// With accessibility features
<IonicButton 
  aria-label="Save the current game"
  data-testid="save-button"
  onClick={handleSave}
>
  Save Game
</IonicButton>
```

## Props

### Required Props

| Prop | Type | Description |
|------|------|-------------|
| `children` | `React.ReactNode` | Button text content |

### Optional Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `color` | `"primary" \| "secondary" \| "tertiary" \| "success" \| "warning" \| "danger" \| "light" \| "medium" \| "dark"` | `"primary"` | Button color variant |
| `size` | `"small" \| "default" \| "large"` | `"default"` | Button size variant |
| `shape` | `"round"` | `undefined` | Button shape variant (only round is supported) |
| `fill` | `"clear" \| "outline" \| "solid" \| "default"` | `"solid"` | Button fill variant |
| `disabled` | `boolean` | `false` | Whether button is disabled |
| `expand` | `"block" \| "full"` | `undefined` | Whether button is expandable |
| `strong` | `boolean` | `false` | Whether button text is bold |
| `className` | `string` | `undefined` | Additional CSS class names |
| `onClick` | `() => void` | `undefined` | Click handler |
| `type` | `"button" \| "submit" \| "reset"` | `"button"` | Button type |
| `aria-label` | `string` | `undefined` | ARIA label for accessibility |
| `data-testid` | `string` | `undefined` | Data test ID for testing |

## Examples

### Button Variants

```tsx
// Primary button (default)
<IonicButton>Primary Action</IonicButton>

// Secondary button
<IonicButton color="secondary" fill="outline">
  Secondary Action
</IonicButton>

// Danger button
<IonicButton color="danger" size="small">
  Delete
</IonicButton>

// Success button
<IonicButton color="success" strong>
  Save Changes
</IonicButton>
```

### Button Sizes

```tsx
// Small button
<IonicButton size="small">Small</IonicButton>

// Default button (default)
<IonicButton>Default</IonicButton>

// Large button
<IonicButton size="large">Large</IonicButton>
```

### Button Shapes

```tsx
// Round button
<IonicButton shape="round" size="small">
  +
</IonicButton>

// Default shape (no shape prop needed)
<IonicButton>Default Shape</IonicButton>
```

### Button Fills

```tsx
// Solid fill (default)
<IonicButton fill="solid">Solid</IonicButton>

// Outline fill
<IonicButton fill="outline">Outline</IonicButton>

// Clear fill
<IonicButton fill="clear">Clear</IonicButton>
```

### Button States

```tsx
// Disabled button
<IonicButton disabled>Disabled</IonicButton>

// Strong text
<IonicButton strong>Bold Text</IonicButton>

// Block expand
<IonicButton expand="block">Full Width</IonicButton>
```

### Accessibility

```tsx
// With ARIA label
<IonicButton aria-label="Close the modal dialog">
  ×
</IonicButton>

// With test ID
<IonicButton data-testid="submit-form">
  Submit
</IonicButton>
```

### Event Handling

```tsx
const handleClick = () => {
  console.log('Button clicked!')
}

<IonicButton onClick={handleClick}>
  Click Me
</IonicButton>
```

## Best Practices

1. **Always provide meaningful text content** for screen readers
2. **Use appropriate colors** for different actions (e.g., danger for destructive actions)
3. **Include ARIA labels** for buttons with only icons or unclear text
4. **Use consistent sizing** within the same interface section
5. **Test with screen readers** to ensure accessibility

## Testing

The component includes comprehensive unit tests covering:

- All prop combinations
- Default prop values
- Event handling
- Accessibility attributes
- Mock data validation

Run tests with:
```bash
npm run test
```

## Mock Data

The component provides mock data for testing different configurations:

```tsx
import { mockIonicButtonProps } from './button.mocks'

// Use in tests
render(<IonicButton {...mockIonicButtonProps.primary} />)
```

Available mock configurations:
- `default` - Basic button
- `primary` - Primary styled button
- `secondary` - Secondary styled button
- `danger` - Danger styled button
- `success` - Success styled button
- `disabled` - Disabled button
- `small` - Small button
- `large` - Large button
- `round` - Round button
- `block` - Block expand button
- `withAriaLabel` - Button with ARIA label
- `withTestId` - Button with test ID

## Dependencies

- `@ionic/react` - Ionic React components
- `react` - React library
- `@testing-library/react` - Testing utilities
- `vitest` - Testing framework

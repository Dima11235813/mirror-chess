import { IonInput } from '@ionic/react';
import type { IonicInputProps } from './input.types';
import { defaultProps } from './input.types';

/**
 * Wrapper component for Ionic Input with customizable properties
 *
 * Provides a consistent interface for input fields across the application
 * with strong typing and accessibility features.
 *
 * @param props - Input configuration properties
 * @returns Rendered Ionic input component
 */
export function IonicInput({ ...restProps }: IonicInputProps) {
  // Merge default props with passed props
  const props = { ...defaultProps, ...restProps };
  
  return <IonInput {...props} />;
}

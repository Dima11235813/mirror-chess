import { IonButton } from '@ionic/react';
import type { IonicButtonProps } from './button.types';
import { defaultProps } from './button.types';

/**
 * Wrapper component for Ionic Button with customizable properties
 *
 * Provides a consistent interface for buttons across the application
 * with strong typing and accessibility features.
 *
 * @param props - Button configuration properties
 * @returns Rendered Ionic button component
 */
export function IonicButton({ children, ...restProps }: IonicButtonProps) {
  // Merge default props with passed props
  const props = { ...defaultProps, ...restProps };
  
  return (
    <IonButton {...props}>
      {children}
    </IonButton>
  );
}

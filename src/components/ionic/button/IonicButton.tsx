import { IonButton } from '@ionic/react';
import type { IonicButtonProps } from './button.types';

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
  const {
    color,
    size,
    shape,
    fill,
    disabled,
    expand,
    strong,
    className,
    onClick,
    type,
    'aria-label': ariaLabel,
    'data-testid': dataTestId,
  } = restProps;
  return (
    <IonButton
      {...(color && { color })}
      {...(size && { size })}
      {...(shape && { shape })}
      {...(fill && { fill })}
      {...(disabled && { disabled })}
      {...(expand && { expand })}
      {...(strong && { strong })}
      {...(className && { className })}
      {...(onClick && { onClick })}
      {...(type && { type })}
      {...(ariaLabel && { 'aria-label': ariaLabel })}
      {...(dataTestId && { 'data-testid': dataTestId })}
      {...restProps}
    >
      {children}
    </IonButton>
  );
}

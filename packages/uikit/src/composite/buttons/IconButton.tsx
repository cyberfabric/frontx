// @cpt-algo:cpt-hai3-algo-uikit-components-validate-ref-pattern:p1
// @cpt-dod:cpt-hai3-dod-uikit-components-ref-pattern:p1
// @cpt-flow:cpt-hai3-flow-uikit-components-consume-composite:p1

import React from 'react';
import { Button, type ButtonProps } from '../../base/button';
import { cn } from '../../lib/utils';
import { ButtonVariant, ButtonSize, IconButtonSize } from '../../types';

/**
 * IconButton component for HAI3 UI-Core
 * Provides a consistent icon-only button across all screens
 * Composes UI Kit Button with icon size variant
 */

export interface IconButtonProps extends Omit<ButtonProps, 'size' | 'asChild'> {
  size?: IconButtonSize;
  'aria-label': string; // Required for accessibility
}

// @cpt-begin:cpt-hai3-algo-uikit-components-validate-ref-pattern:p1:inst-1
// @cpt-begin:cpt-hai3-flow-uikit-components-consume-composite:p1:inst-1
export const IconButton = (
  {
    ref,
    variant = ButtonVariant.Ghost,
    size = IconButtonSize.Default,
    className,
    ...props
  }: IconButtonProps & {
    ref?: React.Ref<HTMLButtonElement>;
  }
) => {
  // Apply custom sizes for icon buttons
  const sizeStyles: Record<IconButtonSize, string> = {
    [IconButtonSize.Small]: 'h-8 w-8',
    [IconButtonSize.Default]: 'h-9 w-9',
    [IconButtonSize.Large]: 'h-10 w-10',
  };

  return (
    <Button
      ref={ref}
      variant={variant}
      size={ButtonSize.Icon}
      className={cn(sizeStyles[size], className)}
      {...props}
    />
  );
};

IconButton.displayName = 'IconButton';
// @cpt-end:cpt-hai3-algo-uikit-components-validate-ref-pattern:p1:inst-1
// @cpt-end:cpt-hai3-flow-uikit-components-consume-composite:p1:inst-1

// Re-export ButtonVariant for convenience
export { ButtonVariant };

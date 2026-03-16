// @cpt-algo:cpt-hai3-algo-uikit-components-validate-ref-pattern:p1
// @cpt-dod:cpt-hai3-dod-uikit-components-ref-pattern:p1
// @cpt-flow:cpt-hai3-flow-uikit-components-consume-composite:p1

import React from 'react';
import { Button } from '../../base/button';
import { ChevronDownIcon } from '../../icons/ChevronDownIcon';
import { ButtonVariant } from '../../types';
import { cn } from '../../lib/utils';

/**
 * DropdownButton Component
 * Button with integrated dropdown chevron icon
 * Used for dropdown triggers in ThemeSelector, ScreensetSelector, etc.
 * Forwards all props to Button for DropdownMenuTrigger compatibility
 */
export interface DropdownButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: ButtonVariant;
  className?: string;
}

// @cpt-begin:cpt-hai3-algo-uikit-components-validate-ref-pattern:p1:inst-1
// @cpt-begin:cpt-hai3-flow-uikit-components-consume-composite:p1:inst-1
export const DropdownButton = (
  {
    ref,
    children,
    variant = ButtonVariant.Outline,
    className,
    ...props
  }: DropdownButtonProps & {
    ref?: React.Ref<HTMLButtonElement>;
  }
) => {
  return (
    <Button
      ref={ref}
      variant={variant}
      className={cn('min-w-40 justify-between rtl:flex-row-reverse', className)}
      {...props}
    >
      <span>{children}</span>
      <ChevronDownIcon className="h-4 w-4" />
    </Button>
  );
};

DropdownButton.displayName = 'DropdownButton';
// @cpt-end:cpt-hai3-algo-uikit-components-validate-ref-pattern:p1:inst-1
// @cpt-end:cpt-hai3-flow-uikit-components-consume-composite:p1:inst-1

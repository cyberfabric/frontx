import React, { forwardRef } from 'react';
import { TextLoader } from '@/app/components/TextLoader';

export interface MenuItemButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Whether the item is currently active/selected
   */
  isActive?: boolean;

  /**
   * Children content (label)
   */
  children: React.ReactNode;
}

/**
 * MenuItemButton Component
 * Reusable menu item button with active state indication
 * Ideal for navigation menu items
 */
export const MenuItemButton = forwardRef<HTMLButtonElement, MenuItemButtonProps>(({
  isActive = false,
  children,
  className = '',
  ...props
}, ref) => {
  // Base styles
  const baseStyles = 'w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors';

  // State-dependent styles
  const stateStyles = isActive
    ? 'text-primary font-medium bg-accent/50'
    : 'text-muted-foreground hover:text-foreground hover:bg-accent/30';

  return (
    <button
      ref={ref}
      type="button"
      className={`${baseStyles} ${stateStyles} ${className}`.trim()}
      {...props}
    >
      <TextLoader skeletonClassName="h-4 w-20" inheritColor>
        {children}
      </TextLoader>
    </button>
  );
});

MenuItemButton.displayName = 'MenuItemButton';

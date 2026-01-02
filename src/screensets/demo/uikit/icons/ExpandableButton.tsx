import React from 'react';
import { ChevronDown } from 'lucide-react';
import { TextLoader } from '@/app/components/TextLoader';

export interface ExpandableButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Whether the button is in expanded state
   */
  isExpanded?: boolean;

  /**
   * Whether the button is in active/selected state
   */
  isActive?: boolean;

  /**
   * Optional badge text to display (e.g., count)
   */
  badge?: string | number;

  /**
   * Children content (label)
   */
  children: React.ReactNode;

  /**
   * Whether to show the chevron icon
   */
  showChevron?: boolean;
}

/**
 * ExpandableButton Component
 * Reusable button with expand/collapse chevron indicator
 * Ideal for navigation menus, accordions, and collapsible sections
 */
export const ExpandableButton: React.FC<ExpandableButtonProps> = ({
  isExpanded = false,
  isActive = false,
  badge,
  children,
  showChevron = true,
  className = '',
  disabled = false,
  ...props
}) => {
  // Base styles
  const baseStyles = 'w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors';

  // State-dependent styles
  const stateStyles = isActive
    ? 'text-primary bg-accent/50'
    : 'text-muted-foreground hover:text-foreground hover:bg-accent/30';

  // Disabled styles
  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed' : '';

  // Chevron styles
  const chevronStyles = `h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`;

  return (
    <button
      type="button"
      className={`${baseStyles} ${stateStyles} ${disabledStyles} ${className}`.trim()}
      disabled={disabled}
      {...props}
    >
      <span className="flex items-center gap-2">
        <TextLoader skeletonClassName="h-4 w-24" inheritColor>
          {children}
        </TextLoader>
        {badge !== undefined && (
          <span className="text-xs text-muted-foreground">
            ({badge})
          </span>
        )}
      </span>
      {showChevron && (
        <ChevronDown className={chevronStyles} aria-hidden="true" />
      )}
    </button>
  );
};

ExpandableButton.displayName = 'ExpandableButton';

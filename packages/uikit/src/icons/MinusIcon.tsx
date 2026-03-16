import React from 'react';

/**
 * Minus Icon
 * Used in Input OTP separator
 * Replaces lucide-react MinusIcon for tree-shaking
 */
export const MinusIcon = ({
  className = '',
  ...props
}: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M5 12h14" />
    </svg>
  );
};

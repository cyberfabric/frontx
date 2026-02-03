/**
 * Close Icon ID
 * Well-known constant defined where it belongs
 */
export const CLOSE_ICON_ID = 'close' as const;

/**
 * Close Icon (X)
 * Core icon for closing dialogs/popups
 * Tree-shakeable - imported and registered by app
 */
export const CloseIcon = ({ className = '' }: { className?: string }) => {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
};

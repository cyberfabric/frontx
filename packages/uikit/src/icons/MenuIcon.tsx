/**
 * Menu Icon ID
 * Well-known constant defined where it belongs
 */
export const MENU_ICON_ID = 'menu' as const;

/**
 * Menu Icon (Hamburger)
 * Core icon for header menu toggle
 * Tree-shakeable - imported and registered by app
 */
export const MenuIcon = ({ className = '' }: { className?: string }) => {
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
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
};

/**
 * @hai3/screensets - Type Definitions
 *
 * Pure TypeScript contracts for HAI3 MFE (Microfrontend) management.
 * This package has ZERO dependencies - pure types and contracts only.
 *
 * NOTE: Layout state shapes (HeaderState, MenuState, etc.) are in @hai3/framework
 */

// ============================================================================
// Layout Domain Enum
// ============================================================================

/**
 * Layout Domain Enum
 * Defines all layout domains that can be orchestrated.
 */
export enum LayoutDomain {
  Header = 'header',
  Footer = 'footer',
  Menu = 'menu',
  Sidebar = 'sidebar',
  Screen = 'screen',
  Popup = 'popup',
  Overlay = 'overlay',
}

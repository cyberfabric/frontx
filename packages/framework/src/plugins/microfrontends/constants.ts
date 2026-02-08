/**
 * HAI3 Layout Domain Constants (Framework L2)
 *
 * Instance IDs for HAI3 base layout domains.
 * These constants live in @hai3/framework because layout domains
 * are runtime configuration owned by the framework layer.
 *
 * @packageDocumentation
 */

// ============================================================================
// Layout Domain Instance IDs
// ============================================================================

/**
 * Popup domain instance ID.
 * Extension domain for popup/modal dialogs.
 */
export const HAI3_POPUP_DOMAIN = 'gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.popup.v1';

/**
 * Sidebar domain instance ID.
 * Extension domain for collapsible side panels.
 */
export const HAI3_SIDEBAR_DOMAIN = 'gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.sidebar.v1';

/**
 * Screen domain instance ID.
 * Extension domain for main content area screens.
 */
export const HAI3_SCREEN_DOMAIN = 'gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.screen.v1';

/**
 * Overlay domain instance ID.
 * Extension domain for full-screen overlays.
 */
export const HAI3_OVERLAY_DOMAIN = 'gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.overlay.v1';

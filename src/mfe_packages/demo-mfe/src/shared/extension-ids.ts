/**
 * Extension IDs from mfe.json
 * Centralized constants for cross-screen navigation references
 */

export const HELLOWORLD_EXTENSION_ID = 'gts.hai3.mfes.ext.extension.v1~hai3.screensets.layout.screen.v1~hai3.demo.screens.helloworld.v1';
export const PROFILE_EXTENSION_ID = 'gts.hai3.mfes.ext.extension.v1~hai3.screensets.layout.screen.v1~hai3.demo.screens.profile.v1';
export const THEME_EXTENSION_ID = 'gts.hai3.mfes.ext.extension.v1~hai3.screensets.layout.screen.v1~hai3.demo.screens.theme.v1';
export const UIKIT_EXTENSION_ID = 'gts.hai3.mfes.ext.extension.v1~hai3.screensets.layout.screen.v1~hai3.demo.screens.uikit.v1';

/**
 * Custom action type for requesting a profile data refresh.
 * Targeted at the Profile extension ID — routed by the mediator to its registered ActionHandler.
 */
// @cpt-FEATURE:child-bridge-action-handler:p3
export const DEMO_ACTION_REFRESH_PROFILE = 'gts.hai3.mfes.comm.action.v1~hai3.demo.action.refresh_profile.v1~';

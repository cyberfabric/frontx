import React from 'react';
import type { ChildMfeBridge } from '@hai3/react';
import { ThemeAwareReactLifecycle } from './shared/ThemeAwareReactLifecycle';
import { HomeScreen } from './screens/home/HomeScreen';

class ProfileCacheDemoMfeLifecycle extends ThemeAwareReactLifecycle {
  protected renderContent(bridge: ChildMfeBridge): React.ReactNode {
    return <HomeScreen bridge={bridge} />;
  }
}

/**
 * Export a singleton instance of the lifecycle class.
 * Module Federation expects a default export; the handler calls
 * moduleFactory() which returns this module, then validates it
 * has mount/unmount methods.
 */
export default new ProfileCacheDemoMfeLifecycle();

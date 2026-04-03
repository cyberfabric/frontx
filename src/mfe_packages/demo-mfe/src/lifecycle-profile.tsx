import React from 'react';
import type { ChildMfeBridge } from '@cyberfabric/react';
import { ThemeAwareReactLifecycle } from '@cyberfabric/react';
import { mfeApp } from './init';
import { ProfileScreen } from './screens/profile/ProfileScreen';

class ProfileLifecycle extends ThemeAwareReactLifecycle {
  constructor() {
    super(mfeApp);
  }

  protected renderContent(bridge: ChildMfeBridge): React.ReactNode {
    return <ProfileScreen bridge={bridge} />;
  }
}

/**
 * Export a singleton instance of the lifecycle class.
 * Module Federation expects a default export; the handler calls
 * moduleFactory() which returns this module, then validates it
 * has mount/unmount methods.
 */
export default new ProfileLifecycle();

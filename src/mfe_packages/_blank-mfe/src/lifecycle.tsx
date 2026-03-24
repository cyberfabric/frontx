import React from 'react';
import type { ChildMfeBridge } from '@hai3/react';
import { ThemeAwareReactLifecycle } from '@hai3/react';
import { mfeApp } from './init';
import { HomeScreen } from './screens/home/HomeScreen';

class BlankMfeLifecycle extends ThemeAwareReactLifecycle {
  constructor() {
    super(mfeApp);
  }

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
export default new BlankMfeLifecycle();

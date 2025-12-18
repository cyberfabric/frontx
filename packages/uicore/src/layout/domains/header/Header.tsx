import React from 'react';
import { useAppSelector } from '../../../hooks/useRedux';
import { UserInfo } from '../../../components/UserInfo';
import { uikitRegistry } from '../../../uikit/uikitRegistry';
import { UiKitComponent } from '@hai3/uikit-contracts';

/**
 * Header Domain
 * Business logic layer - composes header with user info
 * No styling - all presentation in uikit
 */

export const Header: React.FC = () => {
  const visible = useAppSelector((state) => state.uicore.header.visible);

  if (!visible) return null;

  const HeaderUI = uikitRegistry.getComponent(UiKitComponent.Header);

  return (
    <HeaderUI>
      <UserInfo />
    </HeaderUI>
  );
};

Header.displayName = 'Header';

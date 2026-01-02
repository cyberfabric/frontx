/**
 * Menu Component
 *
 * Side navigation menu displaying screenset menu items.
 * Uses @hai3/uikit Sidebar components for proper styling and collapsible behavior.
 */

import React from 'react';
import { useAppSelector, useAppDispatch, useNavigation, useTranslation, type MenuState, type MenuItem } from '@hai3/react';
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuIcon,
  SidebarHeader,
} from '@hai3/uikit';
import { menuActions } from '@hai3/framework';
import { Icon } from '@iconify/react';
import { HAI3LogoIcon } from '@/app/icons/HAI3LogoIcon';
import { HAI3LogoTextIcon } from '@/app/icons/HAI3LogoTextIcon';

export interface MenuProps {
  children?: React.ReactNode;
}

export const Menu: React.FC<MenuProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const menuState = useAppSelector((state) => state['layout/menu'] as MenuState | undefined);
  const { currentScreen, navigateToScreen, currentScreenset } = useNavigation();
  const { t } = useTranslation();

  const collapsed = menuState?.collapsed ?? false;
  const items: MenuItem[] = menuState?.items ?? [];

  const handleToggleCollapse = () => {
    dispatch(menuActions.toggleMenu());
  };

  return (
    <Sidebar collapsed={collapsed}>
      {/* Logo/Brand area with collapse button */}
      <SidebarHeader
        logo={<HAI3LogoIcon />}
        logoText={!collapsed ? <HAI3LogoTextIcon /> : undefined}
        collapsed={collapsed}
        onClick={handleToggleCollapse}
      />

      {/* Menu items */}
      <SidebarContent>
        <SidebarMenu>
          {items.map((item: MenuItem) => {
            const isActive = item.id === currentScreen;

            return (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  isActive={isActive}
                  onClick={() => navigateToScreen(currentScreenset ?? '', item.id)}
                  tooltip={collapsed ? t(item.label) : undefined}
                >
                  {item.icon && (
                    <SidebarMenuIcon>
                      <Icon icon={item.icon} className="w-4 h-4" />
                    </SidebarMenuIcon>
                  )}
                  <span>{t(item.label)}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      {children}
    </Sidebar>
  );
};

Menu.displayName = 'Menu';

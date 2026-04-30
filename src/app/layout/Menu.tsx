/**
 * Menu Component
 *
 * Side navigation menu displaying MFE extensions with presentation metadata.
 * Uses local shadcn/ui Sidebar components for proper styling and collapsible behavior.
 */

import React, { useCallback } from 'react';
import {
  useAppSelector,
  useHAI3,
  useDomainExtensions,
  selectMountedExtension,
  eventBus,
  HAI3_ACTION_MOUNT_EXT,
  HAI3_SCREEN_DOMAIN,
  type MenuState,
  type ScreenExtension,
} from '@cyberfabric/react';
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuIcon,
  SidebarHeader,
} from '@/app/components/ui/sidebar';
import { Icon } from '@iconify/react';
import { HAI3LogoIcon } from '@/app/icons/HAI3LogoIcon';
import { HAI3LogoTextIcon } from '@/app/icons/HAI3LogoTextIcon';

export interface MenuProps {
  children?: React.ReactNode;
}

export const Menu: React.FC<MenuProps> = ({ children }) => {
  const menuState = useAppSelector((state) => state['layout/menu'] as MenuState | undefined);
  const app = useHAI3();
  const { mfeRegistry } = app;

  const collapsed = menuState?.collapsed ?? false;

  const extensions = useDomainExtensions(HAI3_SCREEN_DOMAIN) as ScreenExtension[];
  const activeExtensionId = useAppSelector(
    (state) => selectMountedExtension(state, HAI3_SCREEN_DOMAIN)
  );

  const handleToggleCollapse = () => {
    eventBus.emit('layout/menu/collapsed', { collapsed: !collapsed });
  };

  const handleMenuItemClick = useCallback(
    async (extensionId: string) => {
      if (!mfeRegistry) return;
      await mfeRegistry.executeActionsChain({
        action: {
          type: HAI3_ACTION_MOUNT_EXT,
          target: HAI3_SCREEN_DOMAIN,
          payload: { subject: extensionId },
        },
      });
    },
    [mfeRegistry]
  );

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
          {extensions.length === 0 ? (
            <div className="px-3 py-4 text-sm text-muted-foreground">
              No screen extensions registered.
            </div>
          ) : (
            extensions.map((extension) => {
              const { label, icon } = extension.presentation;
              const isActive = extension.id === activeExtensionId;
              return (
                <SidebarMenuItem key={extension.id}>
                  <SidebarMenuButton
                    isActive={isActive}
                    onClick={() => handleMenuItemClick(extension.id)}
                    tooltip={collapsed ? label : undefined}
                  >
                    {icon && (
                      <SidebarMenuIcon>
                        <Icon icon={icon} className="w-4 h-4" />
                      </SidebarMenuIcon>
                    )}
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })
          )}
        </SidebarMenu>
      </SidebarContent>

      {children}
    </Sidebar>
  );
};

Menu.displayName = 'Menu';

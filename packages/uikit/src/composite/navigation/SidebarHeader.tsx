// @cpt-algo:cpt-hai3-algo-uikit-components-validate-ref-pattern:p1
// @cpt-dod:cpt-hai3-dod-uikit-components-ref-pattern:p1
// @cpt-dod:cpt-hai3-dod-uikit-components-navigation:p1
// @cpt-flow:cpt-hai3-flow-uikit-components-consume-composite:p1

/**
 * Sidebar Header Component
 * Pure presentational component for sidebar logo/branding area
 * Used with Sidebar component for consistent header styling
 */

import * as React from "react"
import { cn } from "../../lib/utils"
import { SidebarMenuButton, SidebarMenuIcon, SidebarMenuLabel } from "./Sidebar"

export interface SidebarHeaderProps extends React.ComponentProps<"div"> {
  /**
   * Logo icon element (should be properly sized SVG)
   */
  logo?: React.ReactNode
  /**
   * Logo text/branding element (shown when expanded)
   */
  logoText?: React.ReactNode
  /**
   * Whether the sidebar is collapsed
   */
  collapsed?: boolean
  /**
   * Click handler for the header area
   */
  onClick?: () => void
}

// @cpt-begin:cpt-hai3-algo-uikit-components-validate-ref-pattern:p1:inst-1
// @cpt-begin:cpt-hai3-flow-uikit-components-consume-composite:p1:inst-1
const SidebarHeader = (
  {
    ref,
    logo,
    logoText,
    collapsed = false,
    onClick,
    className,
    ...props
  }: SidebarHeaderProps & {
    ref?: React.Ref<HTMLDivElement>;
  }
) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col h-16",
        className
      )}
      {...props}
    >
      <div className="flex items-center flex-1 px-2">
        <SidebarMenuButton onClick={onClick} tooltip={collapsed ? "Expand menu" : "Collapse menu"}>
          {logo && <SidebarMenuIcon>{logo}</SidebarMenuIcon>}
          {logoText && (
            <SidebarMenuLabel className="[&>svg]:h-5 [&>svg]:w-auto">
              {logoText}
            </SidebarMenuLabel>
          )}
        </SidebarMenuButton>
      </div>
      <div className="border-b border-mainMenu-border mx-4" />
    </div>
  )
}

SidebarHeader.displayName = "SidebarHeader"
// @cpt-end:cpt-hai3-algo-uikit-components-validate-ref-pattern:p1:inst-1
// @cpt-end:cpt-hai3-flow-uikit-components-consume-composite:p1:inst-1

export { SidebarHeader }

// @cpt-algo:cpt-hai3-algo-uikit-components-validate-ref-pattern:p1
// @cpt-dod:cpt-hai3-dod-uikit-components-ref-pattern:p1
// @cpt-flow:cpt-hai3-flow-uikit-components-consume-base:p1

"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "../lib/utils"

// @cpt-begin:cpt-hai3-algo-uikit-components-validate-ref-pattern:p1:inst-1
// @cpt-begin:cpt-hai3-flow-uikit-components-consume-base:p1:inst-1
const TooltipProvider = ({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) => (
  <TooltipPrimitive.Provider
    delayDuration={delayDuration}
    {...props}
  />
)
TooltipProvider.displayName = TooltipPrimitive.Provider.displayName

const Tooltip = ({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) => (
  <TooltipProvider>
    <TooltipPrimitive.Root {...props} />
  </TooltipProvider>
)
Tooltip.displayName = TooltipPrimitive.Root.displayName

const TooltipTrigger = (
  {
    ref,
    ...props
  }: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger> & {
    ref?: React.Ref<React.ComponentRef<typeof TooltipPrimitive.Trigger>>;
  }
) => (<TooltipPrimitive.Trigger ref={ref} {...props} />)
TooltipTrigger.displayName = TooltipPrimitive.Trigger.displayName

const TooltipContent = (
  {
    ref,
    className,
    sideOffset = 4,
    ...props
  }: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
    ref?: React.Ref<React.ComponentRef<typeof TooltipPrimitive.Content>>;
  }
) => (<TooltipPrimitive.Portal>
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
</TooltipPrimitive.Portal>)
TooltipContent.displayName = TooltipPrimitive.Content.displayName
// @cpt-end:cpt-hai3-algo-uikit-components-validate-ref-pattern:p1:inst-1
// @cpt-end:cpt-hai3-flow-uikit-components-consume-base:p1:inst-1

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }

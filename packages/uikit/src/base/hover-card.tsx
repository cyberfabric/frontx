// @cpt-algo:cpt-hai3-algo-uikit-components-validate-ref-pattern:p1
// @cpt-dod:cpt-hai3-dod-uikit-components-ref-pattern:p1
// @cpt-flow:cpt-hai3-flow-uikit-components-consume-base:p1

import * as React from "react"
import * as HoverCardPrimitive from "@radix-ui/react-hover-card"

import { cn } from "../lib/utils"

const HoverCard = HoverCardPrimitive.Root

HoverCard.displayName = "HoverCard"

// @cpt-begin:cpt-hai3-algo-uikit-components-validate-ref-pattern:p1:inst-1
// @cpt-begin:cpt-hai3-flow-uikit-components-consume-base:p1:inst-1
const HoverCardTrigger = (
  {
    ref,
    ...props
  }: React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Trigger> & {
    ref?: React.Ref<React.ComponentRef<typeof HoverCardPrimitive.Trigger>>;
  }
) => (<HoverCardPrimitive.Trigger
  ref={ref}
  data-slot="hover-card-trigger"
  {...props}
/>)
HoverCardTrigger.displayName = "HoverCardTrigger"

const HoverCardContent = (
  {
    ref,
    className,
    align = "center",
    sideOffset = 4,
    ...props
  }: React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content> & {
    ref?: React.Ref<React.ComponentRef<typeof HoverCardPrimitive.Content>>;
  }
) => (<HoverCardPrimitive.Portal data-slot="hover-card-portal">
  <HoverCardPrimitive.Content
    ref={ref}
    data-slot="hover-card-content"
    align={align}
    sideOffset={sideOffset}
    className={cn(
      "z-50 w-64 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
</HoverCardPrimitive.Portal>)
HoverCardContent.displayName = "HoverCardContent"
// @cpt-end:cpt-hai3-algo-uikit-components-validate-ref-pattern:p1:inst-1
// @cpt-end:cpt-hai3-flow-uikit-components-consume-base:p1:inst-1

export { HoverCard, HoverCardTrigger, HoverCardContent }

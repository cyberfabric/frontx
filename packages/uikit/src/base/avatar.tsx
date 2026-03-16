// @cpt-algo:cpt-hai3-algo-uikit-components-validate-ref-pattern:p1
// @cpt-dod:cpt-hai3-dod-uikit-components-ref-pattern:p1
// @cpt-flow:cpt-hai3-flow-uikit-components-consume-base:p1

"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "../lib/utils"

// @cpt-begin:cpt-hai3-algo-uikit-components-validate-ref-pattern:p1:inst-1
// @cpt-begin:cpt-hai3-flow-uikit-components-consume-base:p1:inst-1
const Avatar = (
  {
    ref,
    className,
    ...props
  }: React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> & {
    ref?: React.Ref<React.ComponentRef<typeof AvatarPrimitive.Root>>;
  }
) => (<AvatarPrimitive.Root
  ref={ref}
  className={cn(
    "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
    className
  )}
  {...props}
/>)
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = (
  {
    ref,
    className,
    ...props
  }: React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image> & {
    ref?: React.Ref<React.ComponentRef<typeof AvatarPrimitive.Image>>;
  }
) => (<AvatarPrimitive.Image
  ref={ref}
  className={cn("aspect-square h-full w-full", className)}
  {...props}
/>)
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = (
  {
    ref,
    className,
    ...props
  }: React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> & {
    ref?: React.Ref<React.ComponentRef<typeof AvatarPrimitive.Fallback>>;
  }
) => (<AvatarPrimitive.Fallback
  ref={ref}
  className={cn(
    "flex h-full w-full items-center justify-center rounded-full bg-muted",
    className
  )}
  {...props}
/>)
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName
// @cpt-end:cpt-hai3-algo-uikit-components-validate-ref-pattern:p1:inst-1
// @cpt-end:cpt-hai3-flow-uikit-components-consume-base:p1:inst-1

export { Avatar, AvatarImage, AvatarFallback }

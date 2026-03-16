// @cpt-algo:cpt-hai3-algo-uikit-components-validate-ref-pattern:p1
// @cpt-dod:cpt-hai3-dod-uikit-components-ref-pattern:p1
// @cpt-flow:cpt-hai3-flow-uikit-components-consume-base:p1

"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "../lib/utils"

// @cpt-begin:cpt-hai3-algo-uikit-components-validate-ref-pattern:p1:inst-1
// @cpt-begin:cpt-hai3-flow-uikit-components-consume-base:p1:inst-1
const Progress = (
  {
    ref,
    className,
    value,
    ...props
  }: React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    ref?: React.Ref<React.ComponentRef<typeof ProgressPrimitive.Root>>;
  }
) => (<ProgressPrimitive.Root
  ref={ref}
  className={cn(
    "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
    className
  )}
  {...props}
>
  <ProgressPrimitive.Indicator
    className="h-full w-full flex-1 bg-primary transition-all"
    style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
  />
</ProgressPrimitive.Root>)
Progress.displayName = ProgressPrimitive.Root.displayName
// @cpt-end:cpt-hai3-algo-uikit-components-validate-ref-pattern:p1:inst-1
// @cpt-end:cpt-hai3-flow-uikit-components-consume-base:p1:inst-1

export { Progress }

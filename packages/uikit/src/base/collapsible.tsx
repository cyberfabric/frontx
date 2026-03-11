// @cpt-algo:cpt-hai3-algo-uikit-components-validate-ref-pattern:p1
// @cpt-dod:cpt-hai3-dod-uikit-components-ref-pattern:p1
// @cpt-flow:cpt-hai3-flow-uikit-components-consume-base:p1

import * as React from "react"
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"

// @cpt-begin:cpt-hai3-algo-uikit-components-validate-ref-pattern:p1:inst-1
// @cpt-begin:cpt-hai3-flow-uikit-components-consume-base:p1:inst-1
const Collapsible = (
  {
    ref,
    ...props
  }: React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Root> & {
    ref?: React.Ref<React.ComponentRef<typeof CollapsiblePrimitive.Root>>;
  }
) => (<CollapsiblePrimitive.Root
  ref={ref}
  data-slot="collapsible"
  {...props}
/>)
Collapsible.displayName = "Collapsible"

const CollapsibleTrigger = (
  {
    ref,
    ...props
  }: React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleTrigger> & {
    ref?: React.Ref<React.ComponentRef<typeof CollapsiblePrimitive.CollapsibleTrigger>>;
  }
) => (<CollapsiblePrimitive.CollapsibleTrigger
  ref={ref}
  data-slot="collapsible-trigger"
  {...props}
/>)
CollapsibleTrigger.displayName = "CollapsibleTrigger"

const CollapsibleContent = (
  {
    ref,
    ...props
  }: React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleContent> & {
    ref?: React.Ref<React.ComponentRef<typeof CollapsiblePrimitive.CollapsibleContent>>;
  }
) => (<CollapsiblePrimitive.CollapsibleContent
  ref={ref}
  data-slot="collapsible-content"
  {...props}
/>)
CollapsibleContent.displayName = "CollapsibleContent"
// @cpt-end:cpt-hai3-algo-uikit-components-validate-ref-pattern:p1:inst-1
// @cpt-end:cpt-hai3-flow-uikit-components-consume-base:p1:inst-1

export { Collapsible, CollapsibleTrigger, CollapsibleContent }

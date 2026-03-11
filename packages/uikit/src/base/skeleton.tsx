// @cpt-algo:cpt-hai3-algo-uikit-components-validate-ref-pattern:p1
// @cpt-dod:cpt-hai3-dod-uikit-components-ref-pattern:p1
// @cpt-flow:cpt-hai3-flow-uikit-components-consume-base:p1

import { cn } from "../lib/utils"

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * If true, skeleton inherits text color instead of using bg-muted
   * Useful for buttons, menu items, and colored text
   */
  inheritColor?: boolean;
}

// @cpt-begin:cpt-hai3-algo-uikit-components-validate-ref-pattern:p1:inst-1
// @cpt-begin:cpt-hai3-flow-uikit-components-consume-base:p1:inst-1
function Skeleton({
  className,
  inheritColor = false,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md",
        inheritColor ? "bg-current opacity-20" : "bg-muted",
        className
      )}
      {...props}
    />
  )
}
// @cpt-end:cpt-hai3-algo-uikit-components-validate-ref-pattern:p1:inst-1
// @cpt-end:cpt-hai3-flow-uikit-components-consume-base:p1:inst-1

export { Skeleton }

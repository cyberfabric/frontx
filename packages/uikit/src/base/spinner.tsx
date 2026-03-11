// @cpt-algo:cpt-hai3-algo-uikit-components-validate-ref-pattern:p1
// @cpt-dod:cpt-hai3-dod-uikit-components-ref-pattern:p1
// @cpt-flow:cpt-hai3-flow-uikit-components-consume-base:p1

import * as React from "react"
import { Loader2 } from "lucide-react"
import { trim } from "lodash"

import { cn } from "../lib/utils"

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ComponentType<{ className?: string }>
  size?: string
}

// @cpt-begin:cpt-hai3-algo-uikit-components-validate-ref-pattern:p1:inst-1
// @cpt-begin:cpt-hai3-flow-uikit-components-consume-base:p1:inst-1
const Spinner = (
  {
    ref,
    className,
    icon: Icon = Loader2,
    size = "size-4",
    ...props
  }: SpinnerProps & {
    ref?: React.Ref<HTMLDivElement>;
  }
) => {
  // Extract text-* color classes for the icon, keep other classes for wrapper
  const textColorClasses = className?.match(/\btext-\S+/g)?.join(' ') || '';
  const wrapperClasses = trim(className?.replace(/\btext-\S+/g, '') || '');

  return (
    <div
      ref={ref}
      className={cn("inline-flex items-center justify-center", wrapperClasses)}
      {...props}
    >
      <Icon className={cn("animate-spin", size, textColorClasses)} />
    </div>
  )
}
Spinner.displayName = "Spinner"
// @cpt-end:cpt-hai3-algo-uikit-components-validate-ref-pattern:p1:inst-1
// @cpt-end:cpt-hai3-flow-uikit-components-consume-base:p1:inst-1

export { Spinner }

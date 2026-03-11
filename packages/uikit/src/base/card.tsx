// @cpt-algo:cpt-hai3-algo-uikit-components-validate-ref-pattern:p1
// @cpt-dod:cpt-hai3-dod-uikit-components-ref-pattern:p1
// @cpt-dod:cpt-hai3-dod-uikit-components-layout:p1
// @cpt-flow:cpt-hai3-flow-uikit-components-consume-base:p1

import * as React from "react"

import { cn } from "../lib/utils"

// @cpt-begin:cpt-hai3-algo-uikit-components-validate-ref-pattern:p1:inst-1
// @cpt-begin:cpt-hai3-flow-uikit-components-consume-base:p1:inst-1
const Card = (
  {
    ref,
    className,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & {
    ref?: React.Ref<HTMLDivElement>;
  }
) => (<div
  ref={ref}
  className={cn(
    "rounded-xl border bg-card text-card-foreground shadow",
    className
  )}
  {...props}
/>)
Card.displayName = "Card"

const CardHeader = (
  {
    ref,
    className,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & {
    ref?: React.Ref<HTMLDivElement>;
  }
) => (<div
  ref={ref}
  className={cn("flex flex-col space-y-1.5 p-6", className)}
  {...props}
/>)
CardHeader.displayName = "CardHeader"

const CardTitle = (
  {
    ref,
    className,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & {
    ref?: React.Ref<HTMLDivElement>;
  }
) => (<div
  ref={ref}
  className={cn("font-semibold leading-none tracking-tight", className)}
  {...props}
/>)
CardTitle.displayName = "CardTitle"

const CardDescription = (
  {
    ref,
    className,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & {
    ref?: React.Ref<HTMLDivElement>;
  }
) => (<div
  ref={ref}
  className={cn("text-sm text-muted-foreground", className)}
  {...props}
/>)
CardDescription.displayName = "CardDescription"

const CardContent = (
  {
    ref,
    className,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & {
    ref?: React.Ref<HTMLDivElement>;
  }
) => (<div ref={ref} className={cn("p-6 pt-0", className)} {...props} />)
CardContent.displayName = "CardContent"

const CardFooter = (
  {
    ref,
    className,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & {
    ref?: React.Ref<HTMLDivElement>;
  }
) => (<div
  ref={ref}
  className={cn("flex items-center p-6 pt-0", className)}
  {...props}
/>)
CardFooter.displayName = "CardFooter"
// @cpt-end:cpt-hai3-algo-uikit-components-validate-ref-pattern:p1:inst-1
// @cpt-end:cpt-hai3-flow-uikit-components-consume-base:p1:inst-1

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }

// @cpt-algo:cpt-hai3-algo-uikit-components-validate-ref-pattern:p1
// @cpt-dod:cpt-hai3-dod-uikit-components-ref-pattern:p1
// @cpt-flow:cpt-hai3-flow-uikit-components-consume-base:p1

// @cpt-dod:cpt-hai3-dod-uikit-components-toast:p1
// @cpt-flow:cpt-hai3-flow-uikit-components-display-toast:p1

import {
  CheckCircle2,
  Info,
  Loader2,
  XOctagon,
  AlertTriangle,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

// @cpt-begin:cpt-hai3-algo-uikit-components-validate-ref-pattern:p1:inst-1
// @cpt-begin:cpt-hai3-flow-uikit-components-consume-base:p1:inst-1
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      icons={{
        success: <CheckCircle2 className="size-4" />,
        info: <Info className="size-4" />,
        warning: <AlertTriangle className="size-4" />,
        error: <XOctagon className="size-4" />,
        loading: <Loader2 className="size-4 animate-spin" />,
      }}
      {...props}
    />
  )
}

// @cpt-end:cpt-hai3-algo-uikit-components-validate-ref-pattern:p1:inst-1
// @cpt-end:cpt-hai3-flow-uikit-components-consume-base:p1:inst-1
export { Toaster }

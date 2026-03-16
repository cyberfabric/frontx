# Feature: UIKit Components

- [x] `p1` - **ID**: `cpt-hai3-featstatus-uikit-components`

<!-- toc -->

- [1. Feature Context](#1-feature-context)
  - [1.1 Overview](#11-overview)
  - [1.2 Purpose](#12-purpose)
  - [1.3 Actors](#13-actors)
  - [1.4 References](#14-references)
- [2. Actor Flows (CDSL)](#2-actor-flows-cdsl)
  - [Consume a Base Component](#consume-a-base-component)
  - [Consume a Composite Component](#consume-a-composite-component)
  - [Apply Theme to Document](#apply-theme-to-document)
  - [Apply Theme to Shadow DOM Root](#apply-theme-to-shadow-dom-root)
  - [Display Toast Notification](#display-toast-notification)
  - [Display Promise Toast](#display-promise-toast)
  - [Register and Look Up Component by Enum](#register-and-look-up-component-by-enum)
- [3. Processes / Business Logic (CDSL)](#3-processes-business-logic-cdsl)
  - [Apply Theme to Document](#apply-theme-to-document-1)
  - [Apply Theme to Shadow Root](#apply-theme-to-shadow-root)
  - [Merge Toast Defaults](#merge-toast-defaults)
  - [Validate Ref-as-Prop Pattern](#validate-ref-as-prop-pattern)
- [4. States (CDSL)](#4-states-cdsl)
  - [Sidebar Collapsed State](#sidebar-collapsed-state)
  - [DataTable Internal State](#datatable-internal-state)
  - [Toast Lifecycle](#toast-lifecycle)
- [5. Definitions of Done](#5-definitions-of-done)
  - [React 19 Ref-as-Prop Pattern](#react-19-ref-as-prop-pattern)
  - [Layout Components](#layout-components)
  - [Navigation Components](#navigation-components)
  - [Form Components](#form-components)
  - [Data Display and Chart Components](#data-display-and-chart-components)
  - [Toast System](#toast-system)
  - [Theme System](#theme-system)
  - [Component Registry Types](#component-registry-types)
  - [Standalone Package Constraint](#standalone-package-constraint)
- [6. Acceptance Criteria](#6-acceptance-criteria)
- [Additional Context](#additional-context)
  - [Composite vs Base Component Boundary](#composite-vs-base-component-boundary)
  - [Tailwind Class and rem Scaling](#tailwind-class-and-rem-scaling)
  - [HSL vs OKLCH Color Formats](#hsl-vs-oklch-color-formats)
  - [No Application State in UIKit](#no-application-state-in-uikit)

<!-- /toc -->

- [x] `p2` - `cpt-hai3-feature-uikit-components`

---

## 1. Feature Context

### 1.1 Overview

`@hai3/uikit` is the standalone presentational component library for the HAI3 dev kit. It delivers a consistent, accessible set of base and composite React components built on shadcn/ui patterns, Radix UI primitives, and Tailwind CSS utility classes.

The library is deliberately independent of every `@hai3/*` framework package — it carries no dependency on `@hai3/state`, `@hai3/framework`, or any L1/L2/L3 layer package. This independence means UIKit can be adopted by any React 19 application regardless of whether it uses the rest of the HAI3 stack.

Primary value: eliminates the cost of building and maintaining a custom component library by providing production-ready, themed, accessible primitives that composition layers can consume directly.

Key assumptions: consumers run React 19; Tailwind CSS and its configuration are available in the consuming application's build pipeline.

### 1.2 Purpose

Enable application developers and screen-set authors to build production interfaces by importing ready-made, typed, accessible components from a single package entry point, without introducing any coupling to HAI3 framework internals.

Success criteria:
- Every component accepts `ref` as a standard prop without `forwardRef`
- All layout, navigation, form, data-display, feedback, and chart categories are covered
- `useToast()` is the sole public API for triggering toast notifications
- Theme CSS variables can be applied to both `document.documentElement` and arbitrary Shadow DOM roots
- The package is tree-shakeable and free of framework dependencies

### 1.3 Actors

- `cpt-hai3-actor-developer` — application and screen-set author consuming components
- `cpt-hai3-actor-uikit-maintainer` — owns the `@hai3/uikit` package; adds, refines, and publishes components

### 1.4 References

- DECOMPOSITION: `cpt-hai3-feature-uikit-components` (section 2.8)
- DESIGN component: `cpt-hai3-component-uikit`
- DESIGN ADR: `cpt-hai3-adr-react-19-ref-as-prop`
- Public interface: `cpt-hai3-interface-uikit`
- OpenSpec: `uikit-base/spec.md`, `uikit-toast/spec.md`
- Related features: `cpt-hai3-feature-react-bindings` (consumes UIKit), `cpt-hai3-feature-studio-devtools` (consumes UIKit)

---

## 2. Actor Flows (CDSL)

### Consume a Base Component

- [x] `p1` - **ID**: `cpt-hai3-flow-uikit-components-consume-base`

**Actors**: `cpt-hai3-actor-developer`

1. [x] `p1` - Developer imports the desired component by name from `@hai3/uikit` - `inst-import-component`
2. [x] `p1` - Developer passes props including an optional `ref` to the component - `inst-pass-props`
3. [x] `p1` - Component renders with Tailwind utility classes derived from the active CSS custom properties - `inst-render-output`
4. [x] `p1` - IF `ref` was provided, the underlying DOM element is bound to the caller's ref - `inst-ref-binding`
5. [x] `p1` - RETURN rendered React element - `inst-return-element`

### Consume a Composite Component

- [x] `p1` - **ID**: `cpt-hai3-flow-uikit-components-consume-composite`

**Actors**: `cpt-hai3-actor-developer`

1. [x] `p1` - Developer imports a composite component (e.g., `Sidebar`, `DataTable`, `IconButton`, `ChatInput`) from `@hai3/uikit` - `inst-import-composite`
2. [x] `p1` - Developer provides domain-level props (e.g., `columns` and `data` for `DataTable`; `collapsed` for `Sidebar`) - `inst-provide-props`
3. [x] `p1` - Composite component composes one or more base primitives internally - `inst-internal-composition`
4. [x] `p1` - RETURN rendered composite element - `inst-return-composite`

### Apply Theme to Document

- [x] `p1` - **ID**: `cpt-hai3-flow-uikit-components-apply-theme-document`

**Actors**: `cpt-hai3-actor-developer`

1. [x] `p1` - Developer imports `applyTheme` and a `Theme`-shaped object from their application code - `inst-import-apply-theme`
2. [x] `p1` - Developer calls `applyTheme(theme, themeName)` during application bootstrap - `inst-call-apply-theme`
3. [x] `p1` - Algorithm: `cpt-hai3-algo-uikit-components-apply-theme-document` runs to set CSS variables on `document.documentElement` - `inst-algo-apply-theme-doc`
4. [x] `p1` - All UIKit components rendered in the document tree reflect the new token values - `inst-components-reflect-theme`
5. [x] `p2` - IF `themeName` ends with `-large`, root font size is set to 125% to enable proportional scaling across all rem-based dimensions - `inst-large-font-scale`
6. [x] `p1` - RETURN void - `inst-return-void`

### Apply Theme to Shadow DOM Root

- [x] `p1` - **ID**: `cpt-hai3-flow-uikit-components-apply-theme-shadow`

**Actors**: `cpt-hai3-actor-developer`

1. [x] `p1` - Developer imports `applyThemeToShadowRoot` - `inst-import-shadow-fn`
2. [x] `p1` - Developer calls `applyThemeToShadowRoot(shadowRoot, theme, themeName)` when a Shadow DOM context is initialised - `inst-call-shadow-fn`
3. [x] `p1` - Algorithm: `cpt-hai3-algo-uikit-components-apply-theme-shadow` runs to inject a `<style>` element with `:host { … }` CSS variable declarations into the shadow root - `inst-algo-apply-theme-shadow`
4. [x] `p1` - IF a style element with id `__hai3-theme-vars__` already exists, it is reused and its content replaced (idempotent) - `inst-reuse-style-element`
5. [x] `p1` - UIKit components rendered inside the shadow root reflect the injected token values - `inst-shadow-components-reflect`
6. [x] `p1` - RETURN void - `inst-return-shadow-void`

### Display Toast Notification

- [x] `p1` - **ID**: `cpt-hai3-flow-uikit-components-display-toast`

**Actors**: `cpt-hai3-actor-developer`

1. [x] `p1` - Developer places a `<Toaster />` component in the component tree once (typically at app root) - `inst-place-toaster`
2. [x] `p1` - Developer calls `const { success, error, warning, info, promise, dismiss } = useToast(options?)` inside a React component - `inst-call-use-toast`
3. [x] `p1` - Developer invokes one of the returned methods with a message string and optional per-call options - `inst-invoke-toast-method`
4. [x] `p1` - Algorithm: `cpt-hai3-algo-uikit-components-toast-merge-defaults` merges hook-level defaults (duration, position) with per-call options - `inst-algo-merge-defaults`
5. [x] `p1` - The Sonner toast is displayed in the active `<Toaster />` viewport position - `inst-sonner-display`
6. [x] `p1` - RETURN the toast ID (`string | number`) - `inst-return-toast-id`

### Display Promise Toast

- [x] `p1` - **ID**: `cpt-hai3-flow-uikit-components-promise-toast`

**Actors**: `cpt-hai3-actor-developer`

1. [x] `p1` - Developer invokes `promise(asyncFn, { loading, success, error })` from `useToast()` - `inst-invoke-promise`
2. [x] `p1` - A loading toast is shown immediately - `inst-loading-toast`
3. [x] `p1` - IF the promise resolves, the loading toast transitions to success with the resolved message - `inst-resolve-success`
4. [x] `p1` - IF the promise rejects, the loading toast transitions to error with the rejection message - `inst-resolve-error`
5. [x] `p1` - RETURN a `PromiseResult<T>` with an `unwrap()` accessor to the original promise - `inst-return-promise-result`

### Register and Look Up Component by Enum

- [x] `p2` - **ID**: `cpt-hai3-flow-uikit-components-registry-lookup`

**Actors**: `cpt-hai3-actor-developer`

1. [x] `p2` - Developer imports `UiKitComponent` enum and `UiKitComponentMap` type from `@hai3/uikit` - `inst-import-enum`
2. [x] `p2` - Developer uses the enum value as a key into a component map of type `UiKitComponentMap` for type-safe dynamic lookup - `inst-enum-lookup`
3. [x] `p2` - IF the component key is present in the map, the associated `ComponentType` is returned - `inst-return-component-type`
4. [x] `p2` - IF the component key is absent, the caller handles the missing case; no default is provided by the library - `inst-missing-key`
5. [x] `p2` - RETURN resolved `ComponentType` or undefined - `inst-return-resolved`

---

## 3. Processes / Business Logic (CDSL)

### Apply Theme to Document

- [x] `p1` - **ID**: `cpt-hai3-algo-uikit-components-apply-theme-document`

Translates a `Theme` object into CSS custom properties on `document.documentElement`, compatible with shadcn/ui's variable naming convention.

1. [x] `p1` - IF `themeName` is provided, set `data-theme` attribute on `document.documentElement` - `inst-set-data-theme`
2. [x] `p1` - FOR EACH color token in `theme.colors` (primary, secondary, accent, background, foreground, muted, border, error, warning, success, info), normalise the value: IF the value starts with `hsl(`, strip the `hsl()` wrapper; IF the value is `transparent`, use as-is - `inst-normalise-colors`
3. [x] `p1` - Set shadcn-named CSS variables (`--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--card`, `--card-foreground`, `--popover`, `--popover-foreground`) on `document.documentElement.style` - `inst-set-shadcn-vars`
4. [x] `p1` - Set semantic state variables (`--error`, `--warning`, `--success`, `--info`) - `inst-set-semantic-vars`
5. [x] `p1` - Set five chart color variables (`--chart-1` through `--chart-5`) using the raw OKLCH values from `theme.colors.chart` without HSL normalisation - `inst-set-chart-vars`
6. [x] `p1` - Set five main-menu variables (`--left-menu`, `--left-menu-foreground`, `--left-menu-hover`, `--left-menu-selected`, `--left-menu-border`) from `theme.colors.mainMenu` - `inst-set-menu-vars`
7. [x] `p1` - FOR EACH entry in `theme.spacing`, set `--spacing-{key}` variable - `inst-set-spacing`
8. [x] `p1` - FOR EACH entry in `theme.borderRadius`, set `--radius-{key}` variable - `inst-set-radius`
9. [x] `p1` - FOR EACH entry in `theme.shadows`, set `--shadow-{key}` variable - `inst-set-shadows`
10. [x] `p1` - FOR EACH entry in `theme.transitions`, set `--transition-{key}` variable - `inst-set-transitions`
11. [x] `p2` - IF `themeName` ends with `-large`, set `document.documentElement.style.fontSize` to `'125%'`; otherwise clear `fontSize` to restore browser default - `inst-large-font-size`
12. [x] `p1` - RETURN void - `inst-return`

### Apply Theme to Shadow Root

- [x] `p1` - **ID**: `cpt-hai3-algo-uikit-components-apply-theme-shadow`

Translates a `Theme` object into a `:host { … }` CSS block injected into a Shadow DOM root, following the same variable set as the document algorithm.

1. [x] `p1` - IF a `<style>` element with `id="__hai3-theme-vars__"` exists in `shadowRoot`, reuse it; otherwise create a new `<style>` element with that id and append it to `shadowRoot` - `inst-get-or-create-style`
2. [x] `p1` - IF `themeName` is provided, set `data-theme` attribute on the style element for debugging traceability - `inst-shadow-data-theme`
3. [x] `p1` - Build a list of CSS variable declarations using the same normalisation and variable naming rules as `cpt-hai3-algo-uikit-components-apply-theme-document` - `inst-build-declarations`
4. [x] `p1` - Wrap all declarations in a `:host { … }` block and assign to `styleElement.textContent` - `inst-wrap-host`
5. [x] `p2` - IF `themeName` ends with `-large`, append an additional `:host { font-size: 125%; }` block - `inst-shadow-large-font`
6. [x] `p1` - RETURN void - `inst-shadow-return`

### Merge Toast Defaults

- [x] `p1` - **ID**: `cpt-hai3-algo-uikit-components-toast-merge-defaults`

Produces the final `ToastOptions` passed to Sonner for each call, combining hook-level defaults with per-call overrides.

1. [x] `p1` - Capture `defaultDuration` and `defaultPosition` from the `UseToastOptions` object passed to `useToast()` - `inst-capture-defaults`
2. [x] `p1` - FOR EACH toast method call, construct a merged options object: start from `{ duration: defaultDuration, position: defaultPosition }`, then spread per-call `options` on top so per-call values take precedence - `inst-spread-options`
3. [x] `p1` - Pass merged options to the corresponding Sonner function (`toast`, `toast.success`, `toast.error`, `toast.warning`, `toast.info`, `toast.loading`) - `inst-pass-to-sonner`
4. [x] `p2` - FOR `promise` calls, pass `options` directly to `toast.promise` without default-duration merging — Sonner controls loading duration internally - `inst-promise-passthrough`
5. [x] `p1` - Memoize the entire returned method bundle via `useMemo([defaultDuration, defaultPosition])` so method references are stable across renders - `inst-memoise`
6. [x] `p1` - RETURN the stable method bundle - `inst-return-bundle`

### Validate Ref-as-Prop Pattern

- [x] `p1` - **ID**: `cpt-hai3-algo-uikit-components-validate-ref-pattern`

Describes the rule applied when authoring or reviewing UIKit components to ensure React 19 native ref conformance. This is a design-time check, not a runtime algorithm.

1. [x] `p1` - IF a component file imports `forwardRef` from `react`, the implementation is non-conformant and MUST be rewritten - `inst-reject-forward-ref`
2. [x] `p1` - Each component function MUST accept `ref` as an explicit prop in its parameter destructuring, typed as `React.Ref<T>` where `T` is the rendered HTML element type - `inst-ref-prop-type`
3. [x] `p1` - The `ref` value MUST be forwarded directly to the underlying DOM element or Radix primitive's `ref` prop - `inst-forward-ref-value`
4. [x] `p1` - The component's exported `ButtonProps` (or equivalent props interface) MUST be compatible with an intersection type including `{ ref?: React.Ref<T> }` when the component needs to surface its ref publicly - `inst-props-intersection`
5. [x] `p1` - RETURN conformant component - `inst-return-conformant`

---

## 4. States (CDSL)

### Sidebar Collapsed State

- [x] `p1` - **ID**: `cpt-hai3-state-uikit-components-sidebar-collapsed`

The `Sidebar` component exposes a controlled collapsed/expanded state via the `collapsed` boolean prop. State ownership lives outside the component (in the consuming screen or layout).

1. [x] `p1` - **FROM** expanded (`collapsed=false`) **TO** collapsed (`collapsed=true`) **WHEN** parent sets `collapsed` prop to `true` - `inst-to-collapsed`
2. [x] `p1` - **FROM** collapsed (`collapsed=true`) **TO** expanded (`collapsed=false`) **WHEN** parent sets `collapsed` prop to `false` - `inst-to-expanded`

Transitions set `data-state` attribute (`"expanded"` or `"collapsed"`) and `data-collapsible` attribute (`""` or `"icon"`) on the underlying `<aside>` element. CSS transition `transition-[width]` handles the visual change.

### DataTable Internal State

- [x] `p1` - **ID**: `cpt-hai3-state-uikit-components-data-table`

`DataTable` maintains internal sorting, filtering, column visibility, and row selection state via `@tanstack/react-table`. An external `table` instance may be provided to override internal state management entirely.

1. [x] `p1` - **FROM** unfiltered **TO** filtered **WHEN** consumer updates the filter value through the `filterInput` slot component - `inst-to-filtered`
2. [x] `p1` - **FROM** filtered **TO** unfiltered **WHEN** filter is cleared - `inst-to-unfiltered`
3. [x] `p1` - **FROM** unsorted **TO** sorted-ascending **WHEN** user clicks a sortable column header - `inst-to-sorted-asc`
4. [x] `p1` - **FROM** sorted-ascending **TO** sorted-descending **WHEN** user clicks the same column header again - `inst-to-sorted-desc`
5. [x] `p1` - **FROM** sorted-descending **TO** unsorted **WHEN** user clicks the same column header a third time - `inst-to-unsorted`
6. [x] `p2` - **FROM** any state **TO** external-controlled **WHEN** a non-null `table` prop is provided; internal state is bypassed - `inst-to-external-controlled`

### Toast Lifecycle

- [x] `p1` - **ID**: `cpt-hai3-state-uikit-components-toast-lifecycle`

Each toast instance produced by `useToast()` progresses through states managed entirely by the Sonner library. UIKit's role is to initiate transitions; Sonner owns the state machine.

1. [x] `p1` - **FROM** absent **TO** visible **WHEN** a toast method is invoked - `inst-toast-appear`
2. [x] `p1` - **FROM** loading **TO** success **WHEN** a `promise` toast's async function resolves - `inst-promise-to-success`
3. [x] `p1` - **FROM** loading **TO** error **WHEN** a `promise` toast's async function rejects - `inst-promise-to-error`
4. [x] `p1` - **FROM** visible **TO** absent **WHEN** the auto-dismiss duration elapses - `inst-auto-dismiss`
5. [x] `p1` - **FROM** visible **TO** absent **WHEN** `dismiss(toastId)` is called - `inst-manual-dismiss`
6. [x] `p1` - **FROM** visible **TO** absent **WHEN** `dismiss()` is called with no argument (dismisses all) - `inst-dismiss-all`

---

## 5. Definitions of Done

### React 19 Ref-as-Prop Pattern

- [x] `p1` - **ID**: `cpt-hai3-dod-uikit-components-ref-pattern`

All components in `packages/uikit/src/` accept `ref` as a plain prop, not via `forwardRef`. `forwardRef` is not imported anywhere in the package.

**Implementation details**:
- Component parameter list includes `ref` destructured alongside other props
- Prop type uses intersection with `{ ref?: React.Ref<ElementType> }`
- `ref` is passed directly to the underlying element or Radix primitive

**Implements**:
- `cpt-hai3-algo-uikit-components-validate-ref-pattern`

**Covers (PRD)**:
- `cpt-hai3-fr-uikit-react19-ref`
- `cpt-hai3-nfr-compat-react`

**Covers (DESIGN)**:
- `cpt-hai3-constraint-typescript-strict-mode`
- `cpt-hai3-adr-react-19-ref-as-prop`
- `cpt-hai3-component-uikit`

---

### Layout Components

- [x] `p1` - **ID**: `cpt-hai3-dod-uikit-components-layout`

The package exports all required layout components: `AspectRatio`, `Drawer`, `ResizablePanelGroup` / `ResizablePanel` / `ResizableHandle`, `ScrollArea` / `ScrollBar`, `Separator`, `Card` family, `Dialog` family, `Sheet` family.

**Implementation details**:
- All components are exported from `packages/uikit/src/index.ts`
- Each component is a thin Radix/Vaul/react-resizable-panels wrapper styled with Tailwind
- Dialog uses `@radix-ui/react-dialog`; Sheet uses `@radix-ui/react-dialog` with side-anchored layout; Drawer uses `vaul`

**Implements**:
- `cpt-hai3-flow-uikit-components-consume-base`
- `cpt-hai3-flow-uikit-components-consume-composite`

**Covers (PRD)**:
- `cpt-hai3-fr-uikit-layout`
- `cpt-hai3-nfr-compat-react`
- `cpt-hai3-nfr-perf-treeshake`

**Covers (DESIGN)**:
- `cpt-hai3-component-uikit`
- `cpt-hai3-constraint-typescript-strict-mode`

---

### Navigation Components

- [x] `p1` - **ID**: `cpt-hai3-dod-uikit-components-navigation`

The package exports all required navigation components: `Breadcrumb` family, `Pagination` family, `NavigationMenu` family, `Menubar` family, `Tabs` family. The `Sidebar` composite also provides collapsible navigation with a controlled `collapsed` boolean prop.

**Implementation details**:
- Navigation base components wrap `@radix-ui/react-navigation-menu`, `@radix-ui/react-menubar`, `@radix-ui/react-tabs`
- Breadcrumb, Pagination are custom HTML-based components styled with Tailwind
- `Sidebar` composite uses HAI3-customised shadcn sidebar — mobile keyboard shortcuts and cookie persistence are removed; only desktop collapsible behaviour is retained

**Implements**:
- `cpt-hai3-flow-uikit-components-consume-composite`
- `cpt-hai3-state-uikit-components-sidebar-collapsed`

**Covers (PRD)**:
- `cpt-hai3-fr-uikit-nav`
- `cpt-hai3-nfr-compat-react`

**Covers (DESIGN)**:
- `cpt-hai3-component-uikit`

---

### Form Components

- [x] `p1` - **ID**: `cpt-hai3-dod-uikit-components-form`

The package exports all required form components: `Input`, `Textarea`, `Checkbox`, `RadioGroup` / `RadioGroupItem`, `NativeSelect` family, `Calendar` / `CalendarDayButton`, `InputOTP` family, `Label`, `Field` family, `InputGroup` family, `DatePicker` family.

**Implementation details**:
- `Input`, `Textarea`, `Label` are HTML element wrappers styled with Tailwind
- `Checkbox`, `RadioGroup` wrap `@radix-ui/react-checkbox` and `@radix-ui/react-radio-group`
- `Calendar` wraps `react-day-picker`; `DatePicker` composes `Calendar` with a `Popover` trigger
- `Field` family provides structured label + description + error layout for form fields
- `InputGroup` family supports prefix/suffix addons and combined button+input compositions
- `Form` family and `useFormField` hook integrate `react-hook-form` via `@hookform/resolvers`

**Implements**:
- `cpt-hai3-flow-uikit-components-consume-base`

**Covers (PRD)**:
- `cpt-hai3-fr-uikit-form`
- `cpt-hai3-nfr-compat-react`

**Covers (DESIGN)**:
- `cpt-hai3-component-uikit`
- `cpt-hai3-constraint-typescript-strict-mode`

---

### Data Display and Chart Components

- [x] `p1` - **ID**: `cpt-hai3-dod-uikit-components-data-display`

The package exports `DataTable` (with pagination, column header, view options sub-components), `ChartContainer`, `ChartTooltipContent`, `ChartLegendContent`, and the full set of Recharts chart type exports.

**Implementation details**:
- `DataTable` wraps `@tanstack/react-table` with internal sort/filter/visibility/row-selection state; accepts an optional external `table` prop to bypass internal state
- `DataTable` composes `Table` base component sub-parts (`TableHeader`, `TableBody`, `TableRow`, etc.)
- Chart components: `ChartContainer` provides a responsive wrapper; `ChartTooltipContent` and `ChartLegendContent` are styled tooltip and legend renderers
- Raw Recharts primitives (`LineChart`, `BarChart`, `AreaChart`, `PieChart`, and all chart elements) are re-exported directly for advanced use

**Implements**:
- `cpt-hai3-flow-uikit-components-consume-composite`
- `cpt-hai3-state-uikit-components-data-table`

**Covers (PRD)**:
- `cpt-hai3-fr-uikit-chart`
- `cpt-hai3-nfr-perf-treeshake`

**Covers (DESIGN)**:
- `cpt-hai3-component-uikit`

---

### Toast System

- [x] `p1` - **ID**: `cpt-hai3-dod-uikit-components-toast`

The package exports `useToast` hook and `Toaster` component. The raw Sonner `toast` function is NOT exported from `@hai3/uikit`. `useToast` returns eight typed methods: `toast`, `success`, `error`, `warning`, `info`, `loading`, `promise`, `dismiss`.

**Implementation details**:
- `useToast(options?)` accepts `defaultDuration` and `defaultPosition`; all methods produced by the hook merge these defaults with per-call options via `cpt-hai3-algo-uikit-components-toast-merge-defaults`
- `promise()` accepts `Promise<T> | (() => Promise<T>)` and a `ToastPromiseOptions<T>` with `loading`, `success`, `error` fields; delegates directly to `toast.promise()`
- `dismiss(toastId?)` dismisses a specific toast or all toasts when called without an argument
- `Toaster` is a re-export of Sonner's `Toaster` component for placement in the component tree
- The `useMemo` dependency array is `[defaultDuration, defaultPosition]` ensuring stable method references

**Implements**:
- `cpt-hai3-flow-uikit-components-display-toast`
- `cpt-hai3-flow-uikit-components-promise-toast`
- `cpt-hai3-algo-uikit-components-toast-merge-defaults`
- `cpt-hai3-state-uikit-components-toast-lifecycle`

**Covers (PRD)**:
- `cpt-hai3-fr-uikit-toast-hook`
- `cpt-hai3-nfr-compat-react`

**Covers (DESIGN)**:
- `cpt-hai3-component-uikit`
- `cpt-hai3-constraint-typescript-strict-mode`

---

### Theme System

- [x] `p1` - **ID**: `cpt-hai3-dod-uikit-components-theme`

The package exports `applyTheme`, `applyThemeToShadowRoot`, and the `Theme` type. These are the only public APIs for applying themes; no runtime theme state is held inside the package.

**Implementation details**:
- `applyTheme(theme, themeName?)` targets `document.documentElement` — used in host application bootstrap
- `applyThemeToShadowRoot(shadowRoot, theme, themeName?)` targets an arbitrary `ShadowRoot` — used by `@hai3/react`'s `MfeContainer` to propagate theme into Shadow DOM MFE contexts
- Both functions follow `cpt-hai3-algo-uikit-components-apply-theme-document` and `cpt-hai3-algo-uikit-components-apply-theme-shadow` respectively
- HSL color values have the `hsl()` wrapper stripped before being written to CSS variables to match shadcn/ui's expected format; OKLCH chart colors are written verbatim
- `applyThemeToShadowRoot` is idempotent: repeated calls on the same shadow root update the existing `<style>` element rather than appending a new one

**Implements**:
- `cpt-hai3-flow-uikit-components-apply-theme-document`
- `cpt-hai3-flow-uikit-components-apply-theme-shadow`
- `cpt-hai3-algo-uikit-components-apply-theme-document`
- `cpt-hai3-algo-uikit-components-apply-theme-shadow`

**Covers (PRD)**:
- `cpt-hai3-nfr-compat-react`
- `cpt-hai3-nfr-perf-treeshake`

**Covers (DESIGN)**:
- `cpt-hai3-component-uikit`
- `cpt-hai3-constraint-typescript-strict-mode`

---

### Component Registry Types

- [x] `p2` - **ID**: `cpt-hai3-dod-uikit-components-registry-types`

The package exports `UiKitComponent` enum, `UiKitIcon` enum, `UiKitComponentMap` interface, and `ComponentName` type, enabling type-safe dynamic component lookup without importing concrete implementations at call sites.

**Implementation details**:
- `UiKitComponent` enum values cover all registerable components: Button, IconButton, DropdownButton, Switch, Skeleton, Spinner, Header, Sidebar family (7 sub-components), UserInfo, DropdownMenu family (7 sub-components)
- `UiKitIcon` enum covers well-known icon slots: Close, AppLogo, AppLogoText
- `UiKitComponentMap` maps each `UiKitComponent` enum key to its `ComponentType<Props>` type
- `ComponentName` is `keyof UiKitComponentMap`
- `TextDirection` type (`'ltr' | 'rtl'`) is exported as a standalone type; it avoids importing from `@hai3/i18n` to keep UIKit dependency-free

**Implements**:
- `cpt-hai3-flow-uikit-components-registry-lookup`

**Covers (PRD)**:
- `cpt-hai3-nfr-maint-zero-crossdeps` (standalone — no @hai3 deps)

**Covers (DESIGN)**:
- `cpt-hai3-component-uikit`
- `cpt-hai3-constraint-typescript-strict-mode`

---

### Standalone Package Constraint

- [x] `p1` - **ID**: `cpt-hai3-dod-uikit-components-standalone`

`@hai3/uikit` has zero `@hai3/*` runtime dependencies. The `package.json` `dependencies` field MUST NOT contain any `@hai3/*` entry. `dependency-cruiser` rules enforce this at CI.

**Implementation details**:
- `peerDependencies` lists `react ^19.2.4` and `react-dom ^19.2.4` only
- All imports from `@radix-ui/*`, `sonner`, `recharts`, `@tanstack/react-table`, `vaul`, `react-resizable-panels`, `react-day-picker`, `cmdk`, `class-variance-authority`, `clsx`, `tailwind-merge` are package-level runtime dependencies
- No import in the package tree may resolve to `@hai3/state`, `@hai3/framework`, `@hai3/react`, or any other `@hai3/*` package

**Implements**: (constraint, no flow)

**Covers (PRD)**:
- `cpt-hai3-nfr-maint-zero-crossdeps`

**Covers (DESIGN)**:
- `cpt-hai3-constraint-zero-cross-deps-at-l1` (UIKit is standalone, same isolation principle)
- `cpt-hai3-component-uikit`

---

## 6. Acceptance Criteria

- [x] `forwardRef` is not imported in any file under `packages/uikit/src/`
- [x] All base and composite components accept an optional `ref` prop typed as `React.Ref<ElementType>`
- [x] `applyTheme` and `applyThemeToShadowRoot` correctly set the full CSS variable set documented in `cpt-hai3-algo-uikit-components-apply-theme-document`
- [x] `applyThemeToShadowRoot` called twice on the same shadow root produces exactly one `<style>` element
- [x] `useToast({ defaultDuration: 5000 })` causes all toast calls from that hook instance to use 5000ms duration unless overridden per-call
- [x] `useToast()` returns stable method references across re-renders when `defaultDuration` and `defaultPosition` have not changed
- [x] Importing `{ toast }` directly from `@hai3/uikit` results in a TypeScript error (not exported)
- [x] `promise(asyncFn, { loading, success, error })` shows loading, transitions to success on resolve, and to error on rejection
- [x] `dismiss(toastId)` removes the specific toast; `dismiss()` removes all visible toasts
- [x] `UiKitComponent` enum and `UiKitComponentMap` allow type-safe dynamic component resolution without importing concrete component implementations
- [x] `@hai3/uikit` has no `@hai3/*` entries in `package.json` dependencies
- [x] `DataTable` renders without error when an external `table` prop is provided
- [x] Theme `-large` suffix causes root font size to become 125% in both document and shadow-root contexts

---

## Additional Context

### Composite vs Base Component Boundary

Base components (`src/base/`) are direct wrappers of Radix UI primitives or minimal HTML elements — they carry no HAI3-specific business conventions. Composite components (`src/composite/`) assemble multiple base primitives and add HAI3-specific behaviour (e.g., `Sidebar` enforces desktop-only collapsible nav; chat components enforce left/right message alignment). New components must be placed in the correct tier to preserve this clarity.

### Tailwind Class and rem Scaling

All sizing and spacing in HAI3 UIKit uses rem-based Tailwind classes (`h-10`, `gap-2`, `p-2`, etc.) rather than fixed pixel values. When `applyTheme` or `applyThemeToShadowRoot` is called with a `-large` theme, the root font-size is set to 125%, which proportionally scales every rem-based dimension — no individual component changes are needed for accessibility large-text support.

### HSL vs OKLCH Color Formats

shadcn/ui CSS variables expect HSL components without the `hsl()` function wrapper (e.g., `221 83% 53%`). The `hslToVar` normalisation function in `applyTheme` handles this stripping. Chart colors use OKLCH format and are written verbatim because Recharts consumes them directly, not through shadcn variable resolution.

### No Application State in UIKit

UIKit components are purely controlled/uncontrolled. They do not subscribe to any Redux store, EventBus, or plugin context. All state that needs to persist across navigation (e.g., sidebar collapsed position) must be lifted to the consuming application layer. This is a hard constraint: violating it would couple UIKit to the framework layer and break standalone usability.

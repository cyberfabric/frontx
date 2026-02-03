# uikit-base Spec Delta

## MODIFIED Requirements

### Requirement: Icon Component Patterns

The system SHALL define icon components using standard function component syntax without React.FC wrapper to align with React 19 best practices.

#### Scenario: Icon components use function syntax

- **WHEN** reviewing icon component implementations in `packages/uikit/src/icons/`
- **THEN** components use standard function syntax: `export const Icon = (props: React.SVGProps<SVGSVGElement>) => { ... }`
- **AND** components do not use `React.FC` type annotation
- **BECAUSE** React 19 removes implicit children from `React.FC` type

#### Scenario: Icon components accept standard SVG props

- **WHEN** using icon components
- **THEN** all icons accept `React.SVGProps<SVGSVGElement>` props including className, width, height, etc.
- **AND** props are spread onto the root `<svg>` element
- **AND** components remain fully typed without `React.FC`

### Requirement: DropdownMenu Component Pattern

The system SHALL define DropdownMenu component using standard function syntax without React.FC wrapper.

#### Scenario: DropdownMenu uses function syntax

- **WHEN** reviewing `packages/uikit/src/base/dropdown-menu.tsx`
- **THEN** DropdownMenu uses standard function syntax with explicit type annotation
- **AND** the component does not use `React.FC` type annotation
- **BECAUSE** React 19 removes implicit children from `React.FC` type

## Context

This change updates icon components and DropdownMenu to use React 19-compatible component patterns. React 19 deprecates `React.FC` because it no longer implicitly includes the `children` prop in the type definition, which was a source of confusion.

**Affected components:**
- 11 icon components: CalendarIcon, CheckIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon, CircleIcon, CloseIcon, MenuIcon, MinusIcon, MoreHorizontalIcon
- DropdownMenu base component

**Compatibility:**
- forwardRef-based components (98 declarations) are NOT modified in this change
- React 19 maintains backward compatibility with forwardRef pattern
- forwardRef migration can be done separately as Phase 2

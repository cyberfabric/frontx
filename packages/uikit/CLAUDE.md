# @hai3/uikit

React UI component library for HAI3 applications, built on shadcn/ui and Radix UI primitives.

## Standalone Package

This package is a **standalone UI library** - it has no @hai3 framework dependencies and can be used independently with any React application.

## Core Concepts

### Component Categories

#### Base Components (shadcn/ui)

Low-level primitives from shadcn/ui:

```typescript
import { Button, Input, Card, Dialog } from '@hai3/uikit';
```

#### Composite Components

Higher-level components built from base primitives:

```typescript
import { IconButton, DropdownButton, ChatInput, ThreadList } from '@hai3/uikit';
```

### Component Variants

Components use variant enums for type-safe styling:

```typescript
import { Button, ButtonVariant, ButtonSize } from '@hai3/uikit';

<Button variant={ButtonVariant.Destructive} size={ButtonSize.Lg}>
  Delete
</Button>
```

### Theme Support

Components support theming via CSS custom properties:

```typescript
import { applyTheme, Theme } from '@hai3/uikit';

const myTheme: Theme = {
  name: 'custom',
  colors: {
    background: '#ffffff',
    foreground: '#000000',
    // ...
  },
};

applyTheme(myTheme);
```

## Registry Pattern

Components and icons are registered for dynamic lookup:

```typescript
import { UiKitComponent, UiKitIcon } from '@hai3/uikit';

// Component enum
UiKitComponent.Button    // 'Button'
UiKitComponent.IconButton // 'IconButton'

// Icon enum
UiKitIcon.Close     // 'close'
UiKitIcon.AppLogo   // 'app-logo'
```

## Key Rules

1. **No business logic** - Components are pure UI, no state management
2. **Props-driven** - All behavior controlled via props
3. **Accessible** - Built on Radix UI for WCAG compliance
4. **Themeable** - All colors via CSS custom properties
5. **Tree-shakeable** - Import only what you need

## Component Props

All components export their prop interfaces:

```typescript
import type { ButtonProps, IconButtonProps, InputProps } from '@hai3/uikit';
```

## Exports

### Enums
- `ButtonVariant` - Button style variants
- `ButtonSize` - Button size options
- `IconButtonSize` - Icon button size options
- `UiKitComponent` - Component registry enum
- `UiKitIcon` - Icon registry enum

### Types
- `Theme` - Theme configuration interface
- `UiKitComponentMap` - Component type mapping
- `ComponentName` - Union of component names
- `TextDirection` - 'ltr' | 'rtl'

### Functions
- `applyTheme()` - Apply theme to document
- `cn()` - Class name utility (clsx + tailwind-merge)

### Components
All shadcn/ui base components plus HAI3 composite components.

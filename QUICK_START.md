# HAI3 UI-Core Quick Start Guide

> **TARGET AUDIENCE:** Humans
> **PURPOSE:** Quick start guide for developers

This guide will help you get started with HAI3 UI-Core development.

## Installation

1. **Install dependencies**
   ```bash
   npm ci
   ```

2. **Build packages**
   ```bash
   npm run build:packages
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open browser**
   Navigate to `http://localhost:5173`

## Project Structure Overview

```
packages/                           # Workspace packages
├── events/                         # SDK L1: Event bus and actions
├── store/                          # SDK L1: Redux store primitives
├── layout/                         # SDK L1: Layout domain slices
├── api/                            # SDK L1: API services and protocols
├── i18n/                           # SDK L1: Internationalization
├── framework/                      # L2: Plugin system and registries
├── react/                          # L3: React bindings and hooks
├── uikit/                          # React component library
├── studio/                         # Development overlay (dev only)
└── cli/                            # CLI tool for project scaffolding

src/
├── screensets/                     # Screensets (vertical slices)
│   ├── demo/                       # Demo screenset
│   └── _blank/                     # Blank screenset template
├── themes/                         # Theme tokens and registries
└── uikit/                          # App-level UIKit registration
```

## Creating Your First Screen

1. **Create a new screen file**
   ```bash
   # Create in a screenset directory
   touch src/screensets/my-screenset/MyScreen.tsx
   ```

2. **Write your screen component**
   ```typescript
   import React from 'react';

   export const MyScreen: React.FC = () => {
     return (
       <div className="p-6">
         <h1 className="text-2xl font-bold">My Screen</h1>
         <p>Content goes here</p>
       </div>
     );
   };
   ```

3. **Use it in App.tsx**
   ```typescript
   import { MyScreen } from '@/screensets/my-screenset/MyScreen';

   // In your CoreLayout children
   <MyScreen />
   ```

## Using Layout Components

### Header
```typescript
<Header
  logo={<Logo />}
  actions={<UserMenu />}
/>
```

### Menu
```typescript
const menuItems: MenuItem[] = [
  {
    id: 'home',
    label: 'Home',
    icon: <HomeIcon />,
  },
];

<Menu items={menuItems} collapsed={false} />
```

### Sidebar
```typescript
<Sidebar
  position="left"
  title="Sidebar Title"
  collapsed={false}
>
  <div>Sidebar content</div>
</Sidebar>
```

### Popup
```typescript
const [open, setOpen] = useState(false);

<Popup
  open={open}
  onClose={() => setOpen(false)}
  title="My Popup"
>
  <div>Popup content</div>
</Popup>
```

## Using Redux State

### Read state
```typescript
import { useAppSelector } from '@hai3/react';

const MyComponent = () => {
  const collapsed = useAppSelector(state => state['layout/menu'].collapsed);

  return <div>Menu collapsed: {collapsed}</div>;
};
```

### Use event-driven actions (recommended)
```typescript
import { useHAI3Actions } from '@hai3/react';

const MyComponent = () => {
  const { toggleMenu } = useHAI3Actions();
  return <button onClick={toggleMenu}>Toggle Menu</button>;
};
```

HAI3 uses event-driven architecture. Prefer action creators that emit events over direct dispatch.

**Note:** For backward compatibility, `@hai3/uicore` re-exports from `@hai3/react` but is deprecated.

## Styling with Tailwind

HAI3 uses Tailwind CSS with custom theme tokens:

```typescript
<div className="bg-background text-foreground">
  <h1 className="text-2xl font-bold text-primary">Title</h1>
  <p className="text-muted-foreground">Description</p>
</div>
```

### Available Theme Colors
- `background` - Main background
- `foreground` - Main text color
- `primary` - Primary brand color
- `secondary` - Secondary color
- `accent` - Accent color
- `muted` - Muted color
- `border` - Border color

## Adding a New UIKit Component

1. **Create component file**
   ```bash
   touch src/uikit/Button.tsx
   ```

2. **Implement component**
   ```typescript
   import React from 'react';
   import { cn } from '@/lib/utils';

   export interface ButtonProps {
     children: React.ReactNode;
     onClick?: () => void;
     variant?: 'primary' | 'secondary';
     className?: string;
   }

   export const Button: React.FC<ButtonProps> = ({
     children,
     onClick,
     variant = 'primary',
     className,
   }) => {
     return (
       <button
         onClick={onClick}
         className={cn(
           'px-4 py-2 rounded font-medium transition-colors',
           variant === 'primary' && 'bg-primary text-primary-foreground',
           variant === 'secondary' && 'bg-secondary text-secondary-foreground',
           className
         )}
       >
         {children}
       </button>
     );
   };
   ```

3. **Export from uikit**
   ```typescript
   // src/uikit/index.ts
   export { Button, type ButtonProps } from './Button';
   ```

## Creating a Screenset

Screensets are vertical slices of your application. Use the HAI3 CLI to create them:

```bash
# Create a new screenset
hai3 screenset create my-screenset

# Or copy an existing one with transformed IDs
hai3 screenset copy demo myDemo
```

### Example Screenset Structure:
```
my-screenset/
├── ids.ts                # All IDs centralized here
├── screens/              # Screen components
│   └── home/
│       ├── HomeScreen.tsx
│       └── i18n/         # Per-screen translations
├── i18n/                 # Screenset-level translations
├── uikit/                # Icons (optional)
└── myScreensetScreenset.tsx  # Self-registering config
```

Screensets auto-register via Vite glob pattern - no manual import needed.

## Development Best Practices

1. **Always use TypeScript types**
   - No `any` types
   - Explicit function return types
   - Proper generics

2. **Use UIKit components**
   - Don't create custom components inline
   - Extract reusable logic to UIKit

3. **Follow Redux patterns**
   - Actions for all state changes
   - Selectors for computed state
   - Keep state normalized

4. **Keep screensets isolated**
   - No cross-screenset dependencies
   - Use global state for shared data

5. **Use Tailwind utilities**
   - Avoid custom CSS when possible
   - Use theme tokens for colors
   - Follow spacing conventions

## Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run build:packages   # Build workspace packages only
npm run preview          # Preview production build

# Validation (run before commits)
npm run lint             # Run ESLint
npm run type-check       # Check TypeScript types
npm run arch:check       # Architecture tests (must pass)
npm run arch:deps        # Dependency rules check

# Clean
npm run clean:deps       # Remove node_modules + reinstall
npm run clean:build      # Clean + build from scratch
```

## Next Steps

- Read [AI Guidelines](./.ai/GUIDELINES.md) for AI coding rules and patterns
- Review [PRD.md](./architecture/PRD.md) for project philosophy
- Explore the existing components in `src/uikit/layout/`
- Build your first screen in `src/screensets/my-screenset/`

## Getting Help

- Check documentation in `/docs`
- Review existing components for patterns
- Refer to TypeScript types for API details

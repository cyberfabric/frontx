# @hai3/uikit

Production-ready React component library for the HAI3 framework.

## Overview

`@hai3/uikit` provides a comprehensive set of accessible, themeable React components built on shadcn/ui and Radix UI primitives. The library serves as the reference implementation of HAI3's component contracts and offers a complete design system for building modern SaaS applications.

## Purpose

This package delivers enterprise-grade UI components with consistent APIs, full TypeScript support, and accessibility built-in. Components follow a hierarchical architecture where base primitives wrap shadcn/ui elements, and composite components combine these primitives into higher-level patterns.

## Component Architecture

### Base Components

Foundation-level components that wrap shadcn/ui primitives with HAI3-specific APIs and conventions. These include buttons, inputs, layout elements, and other atomic UI building blocks. All base components accept standardized prop interfaces defined in the contracts package.

### Composite Components

Higher-level components built by combining base components into common patterns. Examples include icon buttons, theme selectors, and navigation elements. Composites demonstrate best practices for component composition and serve as templates for custom implementations.

### Theme Integration

All components support theming through Tailwind CSS custom properties. Themes define design tokens that components consume automatically, enabling dynamic theme switching without component changes.

## Key Features

- **Type Safety**: Complete TypeScript definitions with strict typing
- **Accessibility**: Built on Radix UI primitives following WAI-ARIA standards
- **Themeable**: Full design system integration via Tailwind CSS
- **Tree-Shakeable**: ES modules with side-effect-free exports
- **Consistent APIs**: Standardized prop interfaces across all components

## Installation

```bash
npm install @hai3/uikit
```

### Required Peer Dependencies

The package requires React 19 and several UI primitive libraries:

```bash
npm install react react-dom @radix-ui/react-select @radix-ui/react-slot \
  class-variance-authority clsx lucide-react tailwind-merge tailwindcss-animate
```

## Integration

### With HAI3 Applications

HAI3 applications integrate UI Kit through the component registry system. Register components at application startup, and the framework makes them available to all screens and layouts.

### As Standalone Library

The package can be used independently of the HAI3 framework. Import components directly and use them as standard React components with full TypeScript support.

## Component Categories

- **Form Controls**: Buttons, inputs, switches, sliders, and selects
- **Layout**: Headers, footers, menus, sidebars, and containers
- **Overlays**: Dialogs, popups, tooltips, and modals
- **Navigation**: Menu items, breadcrumbs, and tabs
- **Data Display**: Cards, lists, avatars, and badges
- **Feedback**: Progress indicators, loaders, and alerts

## Customization

### Styling Approach

Components use Tailwind CSS with class-variance-authority for variant management. Override default styles through className props or customize the Tailwind configuration.

### Component Extension

Build custom components by composing base components or extending existing ones. The type system ensures custom components maintain compatibility with the framework.

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)

## Version

**Alpha Release** (`0.1.0-alpha.0`) - APIs may change before stable release.

## License

Apache-2.0

## Documentation

Full framework documentation: [HAI3 Documentation](https://github.com/HAI3org/HAI3)

## Related Packages

- [`@hai3/uikit-contracts`](../uikit-contracts) - Type definitions and contracts
- [`@hai3/uicore`](../uicore) - Core framework and layout system
- [`@hai3/studio`](../studio) - Development tools overlay

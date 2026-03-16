# Changelog

> **TARGET AUDIENCE:** Humans
> **PURPOSE:** History of changes and version tracking

All notable changes to HAI3 UI-Core will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-10-21

### Added

#### Project Setup
- Initial project structure with TypeScript, React, Vite, and Tailwind CSS
- Package.json with all required dependencies
- TypeScript configuration with strict mode enabled
- Vite configuration with path aliases
- Tailwind CSS configuration with custom theme tokens
- ESLint configuration for code quality
- Git ignore file

#### Core Architecture
- Redux store with Flux pattern implementation
- Core slice for global state (user, tenant, loading, error)
- Layout slice for UI layout state management
- Typed Redux hooks (useAppDispatch, useAppSelector)
- Type definitions for User, Tenant, UILayoutState, PopupState

#### Layout Components (UIKit)
- **Header**: Top navigation bar with logo and actions
- **Footer**: Bottom bar with copyright and links
- **Menu**: Collapsible navigation menu with nested items support
- **Sidebar**: Contextual side panels (left/right positioning)
- **Popup**: Modal/dialog system with backdrop and focus management
- **Overlay**: Backdrop overlay for popups and loading states

#### Core Layout Manager
- CoreLayout component orchestrating all layout elements
- Integration with Redux for state management
- Support for configurable header, footer, menu, and sidebars
- Popup stack management with z-index handling
- Overlay visibility control

#### Styles and Theming
- Global CSS with Tailwind directives
- Default theme configuration with light/dark mode support
- CSS custom properties for theme tokens
- Utility functions for class name merging (cn)

#### Documentation
- Comprehensive README with project overview
- MANIFEST.md defining core philosophy and principles
- MODEL.md describing layout elements
- GUIDELINES.md with development standards
- QUICK_START.md with practical examples
- CONTRIBUTING.md for contribution guidelines
- CHANGELOG.md for version tracking
- .cursorrules for AI-assisted development

#### Demo and Examples
- Demo screen showcasing the layout system
- Sample App.tsx with full layout configuration
- Example menu items with icons
- Main entry point with Redux Provider

#### Development Tools
- Path aliases configuration (@/uikit, @/core, @/screensets, @/styles)
- Type-checking scripts
- Linting configuration
- Development server setup

### Project Philosophy

This initial release establishes the foundation for HAI3's mission:
- **Human-driven UI-Core**: Well-structured, polished base framework
- **AI-driven screens**: Built on top of the UI-Core foundation
- **Modular architecture**: Screensets as vertical slices
- **Layout safety**: All screens fit into defined panel layout
- **Component consistency**: Standardized UI components and styles
- **Microfrontend ready**: Plugin ecosystem support

### Technical Stack

- React 18.3.1
- TypeScript 5.4.2 (strict mode)
- Redux Toolkit 2.2.1
- React Redux 9.1.0
- Vite 5.1.4
- Tailwind CSS 3.4.1
- Lucide React 0.344.0 (icons)

### Next Steps

Future releases will add:
- More UIKit components (Button, Input, Card, Table, etc.)
- API layer with typed contracts
- Authentication and RBAC
- Theme builder and customization tools
- Microfrontend plugin system
- Internationalization (i18n)
- Testing framework
- CLI tools for scaffolding

[0.1.0]: https://github.com/your-org/HAI3/releases/tag/v0.1.0

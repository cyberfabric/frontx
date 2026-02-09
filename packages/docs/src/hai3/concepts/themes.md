---
title: Themes and UI Kits
description: Customizing appearance with themes and UI component libraries
---

# Themes and UI Kits

HAI3 supports multiple UI kits and runtime theme switching, allowing you to customize appearance without rewriting components.

## Overview

**UI Kit:** Component library (MUI, Ant Design, Chakra, or custom)
**Theme:** Visual configuration (colors, typography, spacing)

```
┌─────────────────────────┐
│      Your App           │
├─────────────────────────┤
│  Theme: Dark/Light      │
├─────────────────────────┤
│  UI Kit: MUI/Ant/Chakra │
├─────────────────────────┤
│  HAI3 Framework         │
└─────────────────────────┘
```

**Key Principle:** Choose UI kit at project creation, switch themes at runtime.

## UI Kits

HAI3 supports these UI kits:

### Material-UI (MUI)

Google's Material Design:

```bash
npm create hai3@latest my-app -- --uikit=mui
```

**Pros:**
- Comprehensive component library
- Material Design guidelines
- Excellent documentation
- Large community

**Best for:** Enterprise apps, admin panels

### Ant Design

Alibaba's design system:

```bash
npm create hai3@latest my-app -- --uikit=antd
```

**Pros:**
- Rich component set
- Enterprise focus
- Great for dashboards
- Strong TypeScript support

**Best for:** Data-heavy applications

### Chakra UI

Accessible, composable components:

```bash
npm create hai3@latest my-app -- --uikit=chakra
```

**Pros:**
- Accessibility-first
- Simple API
- Dark mode built-in
- Lightweight

**Best for:** Modern web apps, startups

### Headless (Custom)

No UI kit, bring your own:

```bash
npm create hai3@latest my-app -- --uikit=none
```

**Pros:**
- Full control
- Minimum bundle size
- Use any library (Radix, Headless UI)

**Best for:** Custom designs, unique brands

## Theme Structure

### Theme Configuration

```typescript
interface Theme {
  id: string;
  name: string;
  colors: ColorPalette;
  typography: Typography;
  spacing: SpacingScale;
  components?: ComponentStyles;
}
```

### Color Palette

```typescript
interface ColorPalette {
  primary: {
    main: string;
    light: string;
    dark: string;
    contrastText: string;
  };
  secondary: {
    main: string;
    light: string;
    dark: string;
    contrastText: string;
  };
  background: {
    default: string;
    paper: string;
  };
  text: {
    primary: string;
    secondary: string;
    disabled: string;
  };
  error: ColorShades;
  warning: ColorShades;
  info: ColorShades;
  success: ColorShades;
}
```

### Typography

```typescript
interface Typography {
  fontFamily: string;
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
  fontWeight: {
    light: number;
    normal: number;
    medium: number;
    bold: number;
  };
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
  };
}
```

## Defining Themes

### Light Theme

```typescript
import { defineTheme } from '@hai3/themes';

export const lightTheme = defineTheme({
  id: 'light',
  name: 'Light',
  colors: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
      contrastText: '#ffffff'
    },
    background: {
      default: '#ffffff',
      paper: '#f5f5f5'
    },
    text: {
      primary: '#212121',
      secondary: '#757575'
    }
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
    fontSize: {
      base: '16px'
    }
  }
});
```

### Dark Theme

```typescript
export const darkTheme = defineTheme({
  id: 'dark',
  name: 'Dark',
  colors: {
    primary: {
      main: '#90caf9',
      light: '#e3f2fd',
      dark: '#42a5f5',
      contrastText: '#000000'
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e'
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0b0b0'
    }
  }
});
```

## Theme Registry

### Registering Themes

```typescript
import { themeRegistry } from '@hai3/framework';
import { lightTheme, darkTheme, customTheme } from './themes';

// Register themes
themeRegistry.register('light', lightTheme);
themeRegistry.register('dark', darkTheme);
themeRegistry.register('custom', customTheme);

// Set default
themeRegistry.setDefault('light');
```

### Framework Plugin

```typescript
import { createHAI3 } from '@hai3/framework';
import { themePlugin } from '@hai3/framework/plugins';

const app = createHAI3()
  .use(themePlugin({
    themes: [lightTheme, darkTheme],
    defaultTheme: 'light'
  }))
  .build();
```

## Theme Switching

### Programmatic Switching

```typescript
import { useTheme } from '@hai3/react';

function ThemeSwitcher() {
  const { currentTheme, setTheme, availableThemes } = useTheme();

  return (
    <select
      value={currentTheme}
      onChange={(e) => setTheme(e.target.value)}
    >
      {availableThemes.map(theme => (
        <option key={theme.id} value={theme.id}>
          {theme.name}
        </option>
      ))}
    </select>
  );
}
```

### Toggle Dark/Light

```typescript
function DarkModeToggle() {
  const { currentTheme, setTheme } = useTheme();

  const toggleDarkMode = () => {
    setTheme(currentTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <button onClick={toggleDarkMode}>
      {currentTheme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}
```

### Persist Theme Preference

```typescript
// Automatically persists to localStorage
const app = createHAI3()
  .use(themePlugin({
    themes: [lightTheme, darkTheme],
    persist: true,  // Save preference
    storageKey: 'app-theme'
  }))
  .build();
```

## Creating Custom Themes

### Extend Existing Theme

```typescript
import { lightTheme } from './themes/light';

export const brandTheme = defineTheme({
  ...lightTheme,
  id: 'brand',
  name: 'Brand Theme',
  colors: {
    ...lightTheme.colors,
    primary: {
      main: '#ff6b6b',  // Brand color
      light: '#ff8787',
      dark: '#ee5a52',
      contrastText: '#ffffff'
    }
  }
});
```

### Complete Custom Theme

```typescript
export const retroTheme = defineTheme({
  id: 'retro',
  name: 'Retro',
  colors: {
    primary: {
      main: '#ff6b35',
      light: '#ff8c61',
      dark: '#c54a26',
      contrastText: '#ffffff'
    },
    secondary: {
      main: '#f7931e',
      light: '#ffa94d',
      dark: '#c67716',
      contrastText: '#000000'
    },
    background: {
      default: '#fef6e4',
      paper: '#f3d2c1'
    },
    text: {
      primary: '#001858',
      secondary: '#172c66'
    }
  },
  typography: {
    fontFamily: '"Courier New", monospace',
    fontSize: {
      base: '14px'
    },
    fontWeight: {
      normal: 400,
      bold: 700
    }
  },
  spacing: {
    unit: 8,  // 8px base unit
    scale: [0, 4, 8, 16, 24, 32, 48, 64]
  }
});
```

## Component Theming

### Theme-Aware Components

```typescript
import { useTheme } from '@hai3/react';

function Card({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  return (
    <div
      style={{
        backgroundColor: theme.colors.background.paper,
        color: theme.colors.text.primary,
        padding: theme.spacing[3],
        borderRadius: '8px'
      }}
    >
      {children}
    </div>
  );
}
```

### CSS Variables

```typescript
// Theme generates CSS variables
export const lightTheme = defineTheme({
  id: 'light',
  generateCSSVariables: true,
  colors: { /* ... */ }
});

// Automatically creates:
// --color-primary-main: #1976d2
// --color-background-default: #ffffff
// --font-family: Inter, sans-serif
```

```css
/* Use in CSS */
.my-component {
  background-color: var(--color-background-paper);
  color: var(--color-text-primary);
  font-family: var(--font-family);
}
```

## UI Kit Integration

### MUI Integration

```typescript
import { createTheme } from '@mui/material/styles';
import { ThemeProvider } from '@mui/material';
import { useTheme } from '@hai3/react';

function MUIThemeWrapper({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  const muiTheme = createTheme({
    palette: {
      mode: theme.id === 'dark' ? 'dark' : 'light',
      primary: {
        main: theme.colors.primary.main
      }
    }
  });

  return <ThemeProvider theme={muiTheme}>{children}</ThemeProvider>;
}
```

### Chakra Integration

```typescript
import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { useTheme } from '@hai3/react';

function ChakraThemeWrapper({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  const chakraTheme = extendTheme({
    colors: {
      primary: theme.colors.primary
    }
  });

  return <ChakraProvider theme={chakraTheme}>{children}</ChakraProvider>;
}
```

## Best Practices

**Use Semantic Colors:**
```typescript
// ✅ Good: Semantic naming
colors: {
  primary: { /* ... */ },
  error: { /* ... */ },
  background: { /* ... */ }
}

// ❌ Bad: Literal colors
colors: {
  blue: { /* ... */ },
  red: { /* ... */ }
}
```

**Design for Both Light and Dark:**
```typescript
// ✅ Good: Test both modes
themes: [lightTheme, darkTheme]

// ❌ Bad: Only light mode
themes: [lightTheme]
```

**Use Theme Variables:**
```typescript
// ✅ Good: Use theme
style={{ color: theme.colors.text.primary }}

// ❌ Bad: Hardcode colors
style={{ color: '#000000' }}
```

**Persist User Preference:**
```typescript
// ✅ Good: Remember choice
persist: true

// ❌ Bad: Reset every visit
persist: false
```

## Related Documentation

- [Manifest - Component Consistency](/hai3/architecture/manifest#v3-component-and-style-consistency)
- [TERMINOLOGY](/TERMINOLOGY#ui-theming)
- [Extensibility Guide](/TERMINOLOGY#5-custom-themes)

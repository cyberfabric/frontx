---
title: Getting Started
description: Quick start guide for building with HAI3
---

# Getting Started with HAI3

This guide will help you get up and running with HAI3 in minutes.

## Prerequisites

Before you begin, ensure you have:

- **Node.js** >= 25.1.0
- **npm** >= 11.6.0
- A code editor (VS Code recommended)
- Basic knowledge of React and TypeScript

::: tip Version Check
Check your versions:
```bash
node --version  # Should be >= 25.1.0
npm --version   # Should be >= 11.6.0
```
:::

## Installation

### Option 1: Using the CLI (Recommended)

The HAI3 CLI is the fastest way to create a new project:

```bash
# Install the CLI globally
npm install -g @hai3/cli

# Create a new project
hai3 create my-app

# Follow the interactive prompts to configure:
# - UI kit (MUI, Ant Design, Chakra, or none)
# - TypeScript (recommended)
# - Initial screensets
```

### Option 2: Manual Setup

For existing projects, install HAI3 packages:

```bash
# Core packages
npm install @hai3/framework @hai3/react @hai3/state

# Choose a UI kit (optional)
npm install @hai3/uikit  # For HAI3's default components
# OR
npm install @mui/material @emotion/react @emotion/styled  # For MUI
# OR
npm install antd  # For Ant Design
```

## Project Structure

A HAI3 project follows this structure:

```
my-app/
├── src/
│   ├── screensets/        # Your screensets
│   │   ├── auth/          # Authentication screens
│   │   ├── dashboard/     # Dashboard screens
│   │   └── settings/      # Settings screens
│   ├── themes/            # Custom themes
│   ├── plugins/           # Custom plugins
│   ├── services/          # API services
│   ├── App.tsx            # Application entry
│   └── main.tsx           # React entry
├── package.json
└── vite.config.ts
```

## Your First HAI3 App

### 1. Start the Development Server

```bash
cd my-app
npm run dev
```

Your app will be available at `http://localhost:5173`.

### 2. Understanding the Entry Point

HAI3 apps start with a `HAI3App` component:

```tsx
// src/App.tsx
import { HAI3Provider, AppRouter } from '@hai3/react';
import { Layout } from './layout';

export default function App() {
  return (
    <HAI3Provider>
      <Layout>
        <AppRouter />
      </Layout>
    </HAI3Provider>
  );
}
```

### 3. Create Your First Screenset

A **screenset** is a collection of related screens (e.g., login, signup, forgot password for auth).

```bash
# Using the CLI
hai3 screenset create profile

# Or create manually
mkdir -p src/screensets/profile
```

Create `src/screensets/profile/index.ts`:

```tsx
import type { ScreensetDefinition } from '@hai3/screensets';
import { ScreensetCategory } from '@hai3/screensets';

export const profileScreenset: ScreensetDefinition = {
  id: 'profile',
  name: 'User Profile',
  category: ScreensetCategory.Production,
  defaultScreen: 'view',
  menu: [
    {
      menuItem: { id: 'view', label: 'Profile' },
      screen: () => import('./ProfileScreen')
    }
  ]
};
```

Create `src/screensets/profile/ProfileScreen.tsx`:

```tsx
export function ProfileScreen() {
  return (
    <div>
      <h1>User Profile</h1>
      <p>Welcome to your profile page!</p>
    </div>
  );
}
```

### 4. Add the Screenset to Your App

Update `src/App.tsx`:

```tsx
import { HAI3Provider, AppRouter } from '@hai3/react';
import { Layout } from './layout';

// Screensets are auto-discovered from src/screensets/
// No need to import them in App.tsx

export default function App() {
  return (
    <HAI3Provider>
      <Layout>
        <AppRouter />
      </Layout>
    </HAI3Provider>
  );
}
```

### 5. Navigate Between Screens

Use the navigation hooks to move between screensets:

```tsx
import { useNavigation } from '@hai3/react';

export function DashboardScreen() {
  const { navigateTo } = useNavigation();

  return (
    <div>
      <h1>Dashboard</h1>
      <button onClick={() => navigateTo('profile', 'view')}>
        Go to Profile
      </button>
    </div>
  );
}
```

## Next Steps

Now that you have a basic HAI3 app running, explore these topics:

### Core Concepts
- [Architecture Overview](/hai3/architecture/overview) - Understand HAI3's four-layer architecture
- [Event-Driven Architecture](/hai3/concepts/event-driven) - Learn about the event bus
- [Plugin System](/hai3/concepts/plugins) - Extend HAI3 with plugins

### Guides
- [Creating Screensets](/hai3/guides/creating-screensets) - Build complex screen flows
- [API Integration](/hai3/guides/api-integration) - Connect to backend services
- [Deployment](/hai3/guides/deployment) - Deploy your HAI3 app

### State Management
- [State Overview](/hai3/architecture/sdk/state) - Use Redux Toolkit with HAI3
- Create slices and selectors
- Dispatch actions and handle events

### UI Customization
- [Themes](/hai3/concepts/themes) - Customize appearance
- Choose or create a UI kit
- Apply branding and styling

## Common Tasks

### Adding a New Screen to a Screenset

Create a new screen component in your screenset directory and add it to the menu:

```tsx
// src/screensets/profile/EditScreen.tsx
export function EditScreen() {
  return (
    <div>
      <h1>Edit Profile</h1>
      {/* Your form here */}
    </div>
  );
}

// src/screensets/profile/index.ts - add to menu array
menu: [
  { menuItem: { id: 'view', label: 'Profile' }, screen: () => import('./ProfileScreen') },
  { menuItem: { id: 'edit', label: 'Edit' }, screen: () => import('./EditScreen') }
]
```

### Creating an API Service

Create a service class extending `BaseApiService`:

```tsx
// src/services/UsersService.ts
import { BaseApiService } from '@hai3/api';

export class UsersService extends BaseApiService {
  constructor() {
    super('users', {
      baseURL: 'https://api.example.com',
      protocol: 'rest'
    });
  }

  async getUser(id: string) {
    return this.get(`/users/${id}`);
  }
}
```

### Adding State Management

```tsx
import { createSlice } from '@hai3/state';

export const userSlice = createSlice({
  name: 'user',
  initialState: { profile: null },
  reducers: {
    setProfile: (state, action) => {
      state.profile = action.payload;
    }
  }
});
```

### Emitting and Listening to Events

```tsx
import { eventBus } from '@hai3/framework';
import { useEffect } from 'react';

// Emit an event
function updateProfile(profile) {
  eventBus.emit('user.profile.updated', profile);
}

// Listen to an event
function ProfileListener() {
  useEffect(() => {
    const unsubscribe = eventBus.on('user.profile.updated', (payload) => {
      console.log('Profile updated:', payload);
    });

    return unsubscribe; // Cleanup on unmount
  }, []);

  return null;
}
```

## Troubleshooting

### Port Already in Use

If port 5173 is already in use:

```bash
PORT=3000 npm run dev
```

### Type Errors

Ensure your `tsconfig.json` has strict mode enabled:

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

### Build Errors

Clear build artifacts and rebuild:

```bash
npm run clean
npm install
npm run build
```

## Get Help

- **Documentation**: You're reading it! Browse the sidebar for more topics
- **GitHub Issues**: [Report bugs or request features](https://github.com/HAI3org/HAI3/issues)
- **Examples**: Check the `/examples` directory in the repository

## What's Next?

- **Explore the [AI Product Lifecycle](/lifecycle/)** to understand the full methodology
- **Read the [Architecture docs](/hai3/architecture/overview)** to understand how HAI3 is built
- **Check out [Case Studies](/case-studies/)** to see HAI3 in real projects
- **Review the [API Reference](/hai3/api-reference/state)** for detailed API docs

Happy building! 🚀

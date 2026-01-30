---
title: Deployment
description: Building and deploying HAI3 applications
---

# Deployment

This guide covers building and deploying HAI3 applications to web, desktop, and containerized environments.

## Building for Production

### Production Build

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory:

```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── [images/fonts]
└── favicon.ico
```

### Build Output

- **Code splitting:** Automatic chunk splitting for screensets
- **Minification:** JavaScript and CSS minified
- **Tree shaking:** Unused code removed
- **Asset optimization:** Images and fonts optimized
- **Cache busting:** File hashes for cache invalidation

### Preview Build

Test the production build locally:

```bash
npm run preview
```

Opens the production build at `http://localhost:4173`

## Web Deployment (Static Hosting)

HAI3 apps are static sites that can be deployed to any static hosting platform.

### Vercel

**Deploy with Vercel CLI:**

```bash
npm install -g vercel
vercel
```

**Deploy with Git:**

1. Push code to GitHub
2. Import project in Vercel dashboard
3. Configure build settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Deploy

**vercel.json:**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Netlify

**Deploy with Netlify CLI:**

```bash
npm install -g netlify-cli
netlify deploy --prod
```

**netlify.toml:**

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### GitHub Pages

**Deploy with gh-pages:**

```bash
npm install -D gh-pages
```

**package.json:**

```json
{
  "scripts": {
    "deploy": "npm run build && gh-pages -d dist"
  }
}
```

**vite.config.ts:**

```typescript
export default defineConfig({
  base: '/repo-name/'  // Your GitHub repo name
});
```

**Deploy:**

```bash
npm run deploy
```

### AWS S3 + CloudFront

**1. Build:**

```bash
npm run build
```

**2. Upload to S3:**

```bash
aws s3 sync dist/ s3://your-bucket-name --delete
```

**3. Invalidate CloudFront:**

```bash
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

### Docker (Self-Hosted)

**Dockerfile:**

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf:**

```nginx
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;

  # SPA routing
  location / {
    try_files $uri $uri/ /index.html;
  }

  # Cache static assets
  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
```

**Build and run:**

```bash
docker build -t my-hai3-app .
docker run -p 80:80 my-hai3-app
```

**docker-compose.yml:**

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "80:80"
    restart: unless-stopped
```

## Electron (Desktop App)

HAI3 apps can be packaged as desktop applications with Electron.

### Setup

```bash
npm install -D electron electron-builder
```

**electron/main.js:**

```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load production build
  win.loadFile(path.join(__dirname, '../dist/index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```

**package.json:**

```json
{
  "main": "electron/main.js",
  "scripts": {
    "electron:dev": "electron .",
    "electron:build": "npm run build && electron-builder"
  },
  "build": {
    "appId": "com.example.hai3app",
    "productName": "HAI3 App",
    "directories": {
      "output": "dist-electron"
    },
    "files": [
      "dist/**/*",
      "electron/**/*"
    ],
    "mac": {
      "target": "dmg"
    },
    "win": {
      "target": "nsis"
    },
    "linux": {
      "target": "AppImage"
    }
  }
}
```

**Build:**

```bash
npm run electron:build
```

## Environment Configuration

### Environment Variables

**Development (.env.development):**

```bash
VITE_API_BASE_URL=http://localhost:3000/api
VITE_ANALYTICS_ID=dev-analytics-id
VITE_FEATURE_FLAGS=experimental
```

**Production (.env.production):**

```bash
VITE_API_BASE_URL=https://api.example.com
VITE_ANALYTICS_ID=prod-analytics-id
VITE_FEATURE_FLAGS=stable
```

**Usage:**

```typescript
const apiUrl = import.meta.env.VITE_API_BASE_URL;
const analyticsId = import.meta.env.VITE_ANALYTICS_ID;
```

### Platform-Specific Config

```typescript
// src/config/app.config.ts
export const appConfig = {
  api: {
    baseURL: import.meta.env.VITE_API_BASE_URL,
    timeout: 10000
  },
  features: {
    analytics: import.meta.env.PROD,
    devTools: import.meta.env.DEV
  },
  version: import.meta.env.VITE_APP_VERSION || '1.0.0'
};
```

## Performance Optimization

### Code Splitting

**Lazy load screensets:**

```typescript
import { lazy } from 'react';

const DashboardScreenset = lazy(() => import('./screensets/dashboard'));
const AdminScreenset = lazy(() => import('./screensets/admin'));

<Suspense fallback={<Loading />}>
  <DashboardScreenset />
</Suspense>
```

### Bundle Analysis

```bash
npm run build -- --report
```

Opens bundle analyzer showing:
- Chunk sizes
- Dependencies
- Optimization opportunities

### Vite Configuration

**vite.config.ts:**

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // Optimize chunks
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@mui/material'],
          state: ['@hai3/state', '@reduxjs/toolkit']
        }
      }
    },
    // Chunk size warning
    chunkSizeWarningLimit: 1000
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['@hai3/framework', '@hai3/react']
  }
});
```

### Asset Optimization

**Images:**

```bash
npm install -D vite-plugin-imagemin
```

```typescript
import viteImagemin from 'vite-plugin-imagemin';

export default defineConfig({
  plugins: [
    viteImagemin({
      gifsicle: { optimizationLevel: 7 },
      optipng: { optimizationLevel: 7 },
      mozjpeg: { quality: 80 },
      svgo: {
        plugins: [{ name: 'removeViewBox', active: false }]
      }
    })
  ]
});
```

### Progressive Web App (PWA)

```bash
npm install -D vite-plugin-pwa
```

**vite.config.ts:**

```typescript
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'HAI3 App',
        short_name: 'HAI3',
        description: 'HAI3 Application',
        theme_color: '#1976d2',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
});
```

## Monitoring & Analytics

### Error Tracking (Sentry)

```bash
npm install @sentry/react
```

```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  enabled: import.meta.env.PROD
});
```

### Analytics (Google Analytics)

```typescript
import ReactGA from 'react-ga4';

if (import.meta.env.PROD) {
  ReactGA.initialize(import.meta.env.VITE_GA_ID);
}
```

## CI/CD

### GitHub Actions

**.github/workflows/deploy.yml:**

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

## Best Practices

**✅ Use Environment Variables:**
```typescript
const apiUrl = import.meta.env.VITE_API_BASE_URL;
```

**✅ Enable Code Splitting:**
```typescript
const AdminScreenset = lazy(() => import('./admin'));
```

**✅ Optimize Assets:**
- Compress images
- Minify code
- Use CDN for static assets

**✅ Monitor Performance:**
- Set up error tracking
- Monitor bundle sizes
- Track Core Web Vitals

**✅ Test Production Build:**
```bash
npm run preview
```

## Troubleshooting

**Build fails:**
- Check Node version (≥18.0.0)
- Clear node_modules: `rm -rf node_modules && npm install`
- Check for TypeScript errors

**Routes not working:**
- Configure SPA fallback (`index.html` for all routes)
- Check `base` in vite.config.ts

**Assets not loading:**
- Verify `base` path in config
- Check CORS settings for API
- Inspect network tab in DevTools

## Related Documentation

- [Getting Started](/getting-started)
- [Manifest - Build System](/hai3/architecture/manifest)

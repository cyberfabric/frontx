# hai3:dev-all - Dynamic Dev Server Orchestration

## Overview

`npm run dev:all` автоматически запускает ВСЕ enabled MFE и главное приложение на своих портах.

**Важное:** Никаких изменений `package.json` при добавлении новых MFE не требуется! 🎉

## 🏗️ Architecture

```
npm run dev:all
    ↓
1️⃣  scripts/generate-mfe-manifests.ts
    └─ Читает src/mfe_packages/*/mfe.json
    └─ Генерирует src/app/mfe/generated-mfe-manifests.ts (для Vite)

2️⃣  scripts/dev-all.ts (читает registry)
    └─ src/app/mfe/registry.ts (MFE_REGISTRY с enabled: true/false)
    └─ Генерирует команды для всех enabled MFE

3️⃣  concurrently запускает все одновременно
    ├─ Demo MFE (3001)
    ├─ Notifications MFE (3020)
    └─ Main app (5173+)
```

## 📋 How It Works

### 1. **registry.ts** - Управление MFE
```typescript
export const MFE_REGISTRY: MFERegistryEntry[] = [
  {
    name: 'demo-mfe',           // Имя папки
    port: 3001,                 // Dev порт
    enabled: true,              // ← Будет запущен в dev:all
    description: 'Demo MFE',
  },
  {
    name: 'notifications-mfe',
    port: 3020,
    enabled: true,              // ← Будет запущен в dev:all
    description: 'Notifications',
  },
  {
    name: 'analytics-mfe',
    port: 3030,
    enabled: false,             // ← НЕ будет запущен
    description: 'Analytics (coming soon)',
  },
];
```

### 2. **dev-all.ts** - Динамическая генерация команд
```typescript
// Автоматически читает registry и генерирует:
npm run generate:colors && vite                           // Main app
cd src/mfe_packages/demo-mfe && npm run dev             // Demo (3001)
cd src/mfe_packages/notifications-mfe && npm run dev    // Notifications (3020)
// Пропускает analytics-mfe потому что enabled: false
```

### 3. **Concurrently** - Параллельный запуск
```bash
[0] Demo MFE listening on http://localhost:3001
[1] Notifications MFE listening on http://localhost:3020
[2] Main app listening on http://localhost:5173
```

## 🚀 Usage

### Запустить все dev серверы
```bash
npm run dev:all
# Запустит:
# - Все enabled MFE на их портах
# - Главное приложение на 5173+
```

### Запустить только один MFE (независимо)
```bash
cd src/mfe_packages/notifications-mfe
npm run dev
# → только notifications-mfe на порту 3020
```

### Запустить главное приложение без MFE
```bash
npm run dev
# → только приложение на 5173+, без MFE серверов
```

## 🎛️ Port Management

| MFE | Port | Status |
|-----|------|--------|
| demo-mfe | 3001 | ✅ Enabled |
| notifications-mfe | 3020 | ✅ Enabled |
| analytics-mfe | 3030 | ❌ Disabled |
| (next) | 3040+ | Reserved |
| Main app | 5173+ | Dynamic |

## 📝 Adding a New MFE

### 1. Create the MFE package
```bash
cp -r packages/cli/template-sources/mfe-package/ \
  src/mfe_packages/my-new-mfe/
```

### 2. Update variables
```json
// src/mfe_packages/my-new-mfe/package.json
{
  "name": "@hai3/my-new-mfe",
  "scripts": {
    "dev": "vite --port 3040",    // ← unique port
  }
}
```

### 3. Create mfe.json and lifecycle.tsx
(See `hai3-add-mfe-to-registry.md`)

### 4. Register in registry.ts
```typescript
export const MFE_REGISTRY: MFERegistryEntry[] = [
  // ... existing MFEs
  {
    name: 'my-new-mfe',
    port: 3040,
    enabled: true,
    description: 'My new feature',
  },
];
```

### 5. Run dev:all
```bash
npm run dev:all
# → Automatically picks up your new MFE!
```

**That's it!** No need to edit `package.json` 🎉

## 🎛️ Enable/Disable MFE

### Disable temporarily (without deleting)
```typescript
// src/app/mfe/registry.ts
{
  name: 'notifications-mfe',
  port: 3020,
  enabled: false,  // ← Change to false
  description: 'Notifications',
}
```

```bash
npm run dev:all
# → notifications-mfe WON'T start (but folder still exists)
```

### Re-enable
```typescript
enabled: true,  // ← Change back to true
```

## 🔧 Generate MFE Manifests

`npm run generate:mfe-manifests` генерирует `src/app/mfe/generated-mfe-manifests.ts` из всех `mfe.json` файлов в `src/mfe_packages/*/`.

**Это нужно для Vite** - так как Vite требует статических импортов, динамические импорты с переменными вызывают warnings.

```bash
# Автоматически запускается в dev:all и build:
npm run dev:all     # ← Вызывает generate:mfe-manifests первым

# Можно запустить отдельно:
npm run generate:mfe-manifests

# Исключаемые папки: _blank-mfe, .git, .* (скрытые)
```

**Сгенерированный файл:**
```typescript
// src/app/mfe/generated-mfe-manifests.ts (AUTO-GENERATED)
import mfe0 from '@/mfe_packages/demo-mfe/mfe.json';
import mfe1 from '@/mfe_packages/notifications-mfe/mfe.json';

export const MFE_MANIFESTS = [mfe0, mfe1];
```

⚠️ **НЕ редактируй этот файл** - он автоматически генерируется!

## 🔍 Troubleshooting

### Port already in use
```bash
# Vite automatically tries next available port
# Check logs to see which port it's using
npm run dev:all
# [0] Port 3001 is in use, trying another one...
# [0] Local: http://localhost:3002
```

### MFE not starting
1. Check if enabled in registry.ts
2. Check that `npm run dev` works in MFE folder
3. Check that `package.json` has correct dev script
4. Look at error logs in console

### dev:all command not working
```bash
# Make sure concurrently is installed
npm ls concurrently

# Make sure tsx is installed
npm ls tsx

# Check that scripts/dev-all.ts exists and is readable
ls -la scripts/dev-all.ts
```

## 📚 Related Commands

- `hai3-new-mfe.md` - Create new MFE package
- `hai3-add-mfe-to-registry.md` - Register MFE in system
- `.ai/GUIDELINES.hai3-mfe-setup.md` - MFE architecture guidelines

## 🎯 Key Benefits

✅ **No manual changes to package.json** - add MFE, register in registry, done
✅ **Auto-discovery** - new MFEs detected automatically
✅ **Easy enable/disable** - just change `enabled` flag
✅ **Scalable** - works with 2 MFEs or 20+
✅ **Independent development** - run single MFE without main app
✅ **Parallel execution** - all servers run simultaneously with HMR

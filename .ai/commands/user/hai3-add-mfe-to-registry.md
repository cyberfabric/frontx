# hai3:add-mfe-to-registry - Register New MFE in Centralized Registry

## Когда использовать

После создания нового MFE пакета (с использованием `hai3-new-mfe.md`), нужно зарегистрировать его в централизованной системе для:
1. **Автоматической загрузки в приложение** (bootstrap.ts)
2. **Автоматического запуска в dev:all** (scripts/dev-all.ts)

## Шаги регистрации

### 1️⃣ Обязательные требования для нового MFE

Новый MFE ДОЛЖЕН иметь в своей папке `src/mfe_packages/{name}-mfe/`:

✅ **`package.json`** с правильным dev скриптом:
```json
{
  "name": "@hai3/notifications-mfe",
  "scripts": {
    "dev": "vite --port 3020",
    "build": "vite build",
    "preview": "vite preview --port 3020"
  },
  "dependencies": {
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "@hai3/react": "file:../../../packages/react",
    "@hai3/uikit": "file:../../../packages/uikit"
  }
}
```

✅ **`vite.config.ts`** - Module Federation конфигурация

✅ **`src/lifecycle.tsx`** - MFE точка входа (extends ThemeAwareReactLifecycle)

✅ **`mfe.json`** - манифест расширения:
```json
{
  "manifest": {
    "id": "gts.hai3.mfes.mfe.mf_manifest.v1~hai3.notifications.mfe.manifest.v1",
    "remoteEntry": "http://localhost:3020/assets/remoteEntry.js",
    "remoteName": "notificationsMfe",
    "sharedDependencies": [...]
  },
  "entries": [
    {
      "id": "...",
      "exposedModule": "./lifecycle"
    }
  ],
  "extensions": [
    {
      "id": "...",
      "presentation": {
        "label": "Notifications",
        "icon": "lucide:bell",
        "route": "/notifications"
      }
    }
  ]
}
```

### 2️⃣ Добавить MFE в `src/app/mfe/registry.ts`

Откройте файл и добавьте новую запись в массив `MFE_REGISTRY`:

```typescript
export const MFE_REGISTRY: MFERegistryEntry[] = [
  {
    name: 'demo-mfe',
    port: 3001,
    enabled: true,
    description: 'Demo MFE with example screens',
  },
  // 🆕 ДОБАВИТЬ НОВЫЙ MFE ЗДЕСЬ:
  {
    name: 'notifications-mfe',           // ← Должно совпадать с src/mfe_packages/{name}-mfe/
    port: 3020,                          // ← Уникальный порт для dev сервера
    enabled: true,                       // ← true = запускается в dev:all и загружается в приложение
    description: 'Notifications MFE',
  },
];
```

### 3️⃣ Готово! 🎉

Теперь:
- **`npm run dev:all`** - автоматически:
  1. Генерирует `src/app/mfe/generated-mfe-manifests.ts` (для Vite)
  2. Запускает все enabled MFE на своих портах
  3. Запускает главное приложение
- **Приложение** - автоматически загрузит все enabled MFE через bootstrap.ts
- **Независимая разработка** - запусти `cd src/mfe_packages/{name}-mfe && npm run dev`

**⚠️ НЕ НУЖНО**:
- ❌ Обновлять root `package.json` (автоматически читается registry.ts)
- ❌ Добавлять `dev:mfe:*` скрипты (устарело)
- ❌ Менять `dev:all` команду (динамически генерируется)
- ❌ Редактировать `src/app/mfe/generated-mfe-manifests.ts` (автогенерируется)

## 🎛️ Управление MFE

### Выключить MFE без удаления
```typescript
{
  name: 'notifications-mfe',
  port: 3020,
  enabled: false,  // ← MFE не запустится в dev:all, не загрузится в приложение
  description: 'Notifications MFE',
}
```

### Запустить только один MFE (независимо)
```bash
cd src/mfe_packages/notifications-mfe
npm run dev
# → только этот MFE на порту 3020, без главного приложения
```

## 🚀 Как работает система

### **bootstrap.ts** - Загрузка расширений в приложение
1. Читает `MFE_REGISTRY` из `src/app/mfe/registry.ts`
2. Для каждого MFE с `enabled: true`:
   - Динамически импортирует `src/mfe_packages/{name}-mfe/mfe.json`
   - Регистрирует manifest в типовой системе
   - Регистрирует extensions для URL маршрутизации

### **scripts/dev-all.ts** - Запуск dev серверов
1. Читает `MFE_REGISTRY` из `src/app/mfe/registry.ts`
2. Для каждого MFE с `enabled: true`:
   - Генерирует команду: `cd src/mfe_packages/{name}-mfe && npm run dev`
3. Запускает все команды одновременно (concurrently):
   - Все MFE на своих портах
   - Главное приложение на 5173+
4. **Никаких изменений package.json не требуется!**

## Структура файлов нового MFE

```
src/mfe_packages/notifications-mfe/
├── package.json              # ← обновлено с правильным портом
├── vite.config.ts            # ← Module Federation конфиг
├── tsconfig.json
├── mfe.json                  # ← ✅ ОБЯЗАТЕЛЕН для регистрации!
├── index.html
└── src/
    ├── lifecycle.tsx         # ← Точка входа MFE
    └── screens/
        ├── index.tsx         # Main screen для notifications
        ├── list/
        └── details/
```

## Проверка после регистрации

```bash
# 1. Проверить что нет ошибок импорта
npm run type-check

# 2. Запустить dev сервер (если добавили dev:mfe:notifications скрипт)
npm run dev:all

# 3. Проверить в браузере http://localhost:5173
# - Открыть Studio Overlay (Ctrl+`)
# - Убедиться что новый MFE появился в списке screensets
# - Клик по MFE - должен загрузиться правильно
```

## Отладка

### MFE не загружается

1. Проверить что `mfe.json` существует: `ls -la src/mfe_packages/{name}-mfe/mfe.json`
2. Проверить что JSON валиден: `npm run type-check`
3. Проверить console в браузере на ошибки
4. Убедиться что `enabled: true` в registry.ts

### Ошибка "Failed to load {name}/mfe.json"

- Проверить путь в registry.ts совпадает с именем папки
- Убедиться что `mfe.json` экспортирует объект правильной структуры

## Пример: Полный workflow создания notifications-mfe

```bash
# 1. Скопировать template
cp -r packages/cli/template-sources/mfe-package/ src/mfe_packages/notifications-mfe/

# 2. Обновить переменные в package.json и vite.config.ts
# {{mfeName}} -> notifications
# {{port}} -> 3020

# 3. Создать мfe.json (см. пример выше)

# 4. Добавить в registry.ts:
# {
#   name: 'notifications-mfe',
#   port: 3020,
#   enabled: true,
#   description: 'Notifications MFE',
# }

# 5. Опционально добавить в package.json:
# "dev:mfe:notifications": "cd src/mfe_packages/notifications-mfe && npm run dev"

# 6. Запустить
npm run dev:all
```

---

See also:
- `hai3-new-mfe.md` - создание нового MFE пакета
- `hai3-dev-all.md` - dev сервер конфигурация
- `.ai/GUIDELINES.hai3-mfe-setup.md` - основные guidelines

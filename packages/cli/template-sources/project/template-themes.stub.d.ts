// Template-sources only: real `src/app/themes` is supplied when templates are assembled
// from the monorepo (manifest root.directories). This file is not copied to `templates/`.
declare module '@/app/themes' {
  import type { ThemeConfig } from '@cyberfabric/react';
  export const hai3Themes: ThemeConfig[];
  export const DEFAULT_THEME_ID: string;
}

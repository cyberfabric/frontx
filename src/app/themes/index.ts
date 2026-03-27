// @cpt-dod:cpt-hai3-dod-ui-libraries-choice-theme-propagation:p1
// @cpt-algo:cpt-hai3-algo-ui-libraries-choice-theme-propagation:p1
import type { ThemeConfig } from '@cyberfabric/react';
import { defaultTheme, DEFAULT_THEME_ID } from './default';
import { darkTheme } from './dark';
import { lightTheme } from './light';
import { draculaTheme } from './dracula';
import { draculaLargeTheme } from './dracula-large';

export { DEFAULT_THEME_ID };

export const hai3Themes: ThemeConfig[] = [
  defaultTheme,
  darkTheme,
  lightTheme,
  draculaTheme,
  draculaLargeTheme,
];

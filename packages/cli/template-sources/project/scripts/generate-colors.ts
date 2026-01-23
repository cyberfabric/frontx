/**
 * Build-time script to generate Tailwind colors in HSL format
 * Converts Tailwind's hex colors to HSL once at build time
 * Output: src/themes/tailwindColors.ts (generated file)
 * @file This is a TypeScript Node.js script
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import allColors from 'tailwindcss/colors';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

/**
 * Convert hex color to HSL format
 * #2563eb -> hsl(221 83% 53%)
 * @param hex - Hex color string
 * @returns HSL color string
 */
function hexToHsl(hex: ModernColorName | string): string {
  // Handle special cases
  if (hex === ModernColorName.Inherit || hex === ModernColorName.Current || hex === ModernColorName.Transparent) {
    return hex;
  }

  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Expand shorthand hex (e.g., "fff" -> "ffffff", "000" -> "000000")
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  // Parse hex values
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  // Grayscale colors (including black and white)
  if (max === min) {
    return `hsl(0 0% ${Math.round(l * 100)}%)`;
  }

  const d = max - min;
  // Avoid division by zero for edge cases
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  // Handle NaN from division edge cases
  if (isNaN(s)) {
    return `hsl(0 0% ${Math.round(l * 100)}%)`;
  }

  let h = 0;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    case b:
      h = ((r - g) / d + 4) / 6;
      break;
  }

  return `hsl(${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
}

// Modern Tailwind color names (excludes deprecated: lightBlue, warmGray, trueGray, coolGray, blueGray)
enum ModernColorName {
  Inherit = 'inherit',
  Current = 'current',
  Transparent = 'transparent',
  Black = 'black',
  White = 'white',
  Slate = 'slate',
  Gray = 'gray',
  Zinc = 'zinc',
  Neutral = 'neutral',
  Stone = 'stone',
  Red = 'red',
  Orange = 'orange',
  Amber = 'amber',
  Yellow = 'yellow',
  Lime = 'lime',
  Green = 'green',
  Emerald = 'emerald',
  Teal = 'teal',
  Cyan = 'cyan',
  Sky = 'sky',
  Blue = 'blue',
  Indigo = 'indigo',
  Violet = 'violet',
  Purple = 'purple',
  Fuchsia = 'fuchsia',
  Pink = 'pink',
  Rose = 'rose'
}

// Convert all colors to HSL
const colors: Record<string, unknown> = {};

for (const colorName of Object.values(ModernColorName)) {
  const colorValue = allColors[colorName as keyof typeof allColors];
  if (typeof colorValue === 'string') {
    // Simple color (inherit, current, transparent, black, white)
    colors[colorName] = hexToHsl(colorValue);
  } else if (typeof colorValue === 'object' && colorValue !== null) {
    // Color scale (slate, gray, etc.)
    const colorScale: Record<string, string> = {};
    for (const [shade, hex] of Object.entries(colorValue)) {
      if (typeof hex === 'string') {
        colorScale[shade] = hexToHsl(hex);
      }
    }
    colors[colorName] = colorScale;
  }
}

// Generate TypeScript file
const output = `/**
 * Tailwind colors in HSL format (AUTO-GENERATED)
 * Generated at build time from tailwindcss/colors
 * DO NOT EDIT MANUALLY - run 'npm run generate:colors' to regenerate
 */

export interface TailwindColors {
  inherit: string;
  current: string;
  transparent: string;
  black: string;
  white: string;
  slate: ColorScale;
  gray: ColorScale;
  zinc: ColorScale;
  neutral: ColorScale;
  stone: ColorScale;
  red: ColorScale;
  orange: ColorScale;
  amber: ColorScale;
  yellow: ColorScale;
  lime: ColorScale;
  green: ColorScale;
  emerald: ColorScale;
  teal: ColorScale;
  cyan: ColorScale;
  sky: ColorScale;
  blue: ColorScale;
  indigo: ColorScale;
  violet: ColorScale;
  purple: ColorScale;
  fuchsia: ColorScale;
  pink: ColorScale;
  rose: ColorScale;
}

export interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

const colors: TailwindColors = ${JSON.stringify(colors, null, 2)};

export default colors;
`;

// Write to src/themes/tailwindColors.ts (relative to project root)
// In monorepo: packages/cli/template-sources/project/scripts -> ../../../../../src/themes
// In standalone: scripts -> ../src/themes
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Detect context: monorepo (packages/cli/template-sources/project/scripts) vs standalone (scripts)
const isMonorepo = __dirname.includes('packages/cli/template-sources/project/scripts') || __dirname.includes('packages\\cli\\template-sources\\project\\scripts');
const outputPath = isMonorepo
  ? path.join(__dirname, '../../../../../src/app/themes/tailwindColors.ts')
  : path.join(__dirname, '../src/app/themes/tailwindColors.ts');

// Check if themes directory exists (may not exist in --uikit none projects)
const themesDir = path.dirname(outputPath);
if (!fs.existsSync(themesDir)) {
  console.log('⚠ Skipping tailwindColors.ts generation (themes directory not found)');
  console.log('  This is expected for projects created with --uikit none');
  process.exit(0);
}

fs.writeFileSync(outputPath, output, 'utf8');

console.log('✓ Generated src/app/themes/tailwindColors.ts');
console.log(`  ${Object.keys(colors).length} color families converted to HSL`);

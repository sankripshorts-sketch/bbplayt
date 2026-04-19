/**
 * @deprecated Используйте useThemeColors() из ./theme/ThemeContext.
 * Оставлено для обратной совместимости импортов до полного перехода экранов.
 */
import { palettes } from './theme/palettes';

export const colors = palettes.dark;
export type { ColorPalette, ThemeName } from './theme/palettes';
export { palettes, getPalette } from './theme/palettes';
export { ThemeProvider, useTheme, useThemeColors } from './theme/ThemeContext';
export { fonts, useAppFonts } from './theme/appFonts';
export { applyDefaultTypography } from './theme/applyDefaultTypography';

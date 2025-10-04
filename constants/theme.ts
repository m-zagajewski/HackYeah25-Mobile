/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

// Brand colors for the transport operator
const brandPrimary = 'rgb(236, 0, 140)'; // Pink
const brandSecondary = 'rgb(69, 101, 173)'; // Blue
const brandAccent = 'rgb(228, 175, 0)'; // Yellow

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: brandPrimary,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: brandPrimary,
    primary: brandPrimary,
    secondary: brandSecondary,
    accent: brandAccent,
    card: '#f8f9fa',
    border: '#e9ecef',
    success: '#28a745',
    warning: brandAccent,
    danger: '#dc3545',
    info: brandSecondary,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: brandPrimary,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: brandPrimary,
    primary: brandPrimary,
    secondary: brandSecondary,
    accent: brandAccent,
    card: '#1e1e1e',
    border: '#2d2d2d',
    success: '#28a745',
    warning: brandAccent,
    danger: '#dc3545',
    info: brandSecondary,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

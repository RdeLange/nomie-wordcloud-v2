// The colours the app gives the plugin. When the app is older, the plugin uses its own light and dark values.
export type Palette = {
  page: string;
  card: string;
  cardInner: string;
  text: string;
  textSecondary: string;
  separator: string;
  fill: string;
  tint: string;
  onTint: string;
  tintSoft: string;
  good: string;
  goodSoft: string;
  danger: string;
  onDanger: string;
};

const LIGHT: Palette = { page: '#F2F2F7', card: '#FFFFFF', cardInner: '#F2F2F7', text: '#000000', textSecondary: '#636368', separator: '#D8D8DC', fill: '#E5E5EA', tint: '#0A6CC9', onTint: '#FFFFFF', tintSoft: '#EBF4FD', good: '#1E7A34', goodSoft: '#DDF3E2', danger: '#D70015', onDanger: '#FFFFFF' };
const DARK: Palette = { page: '#000000', card: '#1C1C1E', cardInner: '#2C2C2E', text: '#FFFFFF', textSecondary: '#AEAEB2', separator: '#48484A', fill: '#2C2C2E', tint: '#4DB3FF', onTint: '#000000', tintSoft: '#0B2236', good: '#30D158', goodSoft: '#123620', danger: '#FF6961', onDanger: '#000000' };

export const paletteFrom = (prefs: any): Palette => {
  const colours = prefs?.colours;
  if (colours?.current) return colours.current as Palette;
  return prefs?.theme === 'dark' ? DARK : LIGHT;
};

// Liquid Glass (D-glass): the same values as the app's --glass-liquid-* and --glass-blur tokens in main.css.
// They are not part of the app's colour palette, so the plugin picks them by the theme the app sends.
export type Glass = { fill: string; edge: string; blur: string; shadow: string };
const GLASS_LIGHT: Glass = { fill: 'rgba(255,255,255,0.5)', edge: 'rgba(255,255,255,0.7)', blur: 'blur(16px) saturate(180%)', shadow: '0 8px 24px rgba(0,0,0,0.12)' };
const GLASS_DARK: Glass = { fill: 'rgba(40,40,44,0.45)', edge: 'rgba(255,255,255,0.22)', blur: 'blur(16px) saturate(180%)', shadow: '0 8px 24px rgba(0,0,0,0.5)' };

export const glassFrom = (prefs: any): Glass => (prefs?.theme === 'dark' ? GLASS_DARK : GLASS_LIGHT);

// Tint as text on a grey chip (the fill is #E5E5EA): light mode uses a darker blue, so the text reaches 4.5:1.
// Dark mode keeps the tint. Only chips use this role; buttons and links keep --tint.
export const tintTextFrom = (prefs: any): string => (prefs?.theme === 'dark' ? '#4DB3FF' : '#0764B8');

// Danger as text (a delete or a warning on a grey fill): the app's red is 4.29:1 on #E5E5EA in light mode, so the text uses a darker red
// in light mode and a lighter red in dark mode. Both reach 4.5:1 on the fill. Buttons keep the palette's danger.
export const dangerTextFrom = (prefs: any): string => (prefs?.theme === 'dark' ? '#FF8A84' : '#B0001A');

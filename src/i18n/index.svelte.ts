// The plugin's own text, in the five languages the app ships (en, de, es, it, nl). The app sends its language in
// prefs.language (en, de, es, it or nl). A language the plugin does not have falls back to English, and so does a
// missing key. `t` reads the current language, so a screen that calls it updates when the app changes the language.
import en from './en.json';
import de from './de.json';
import es from './es.json';
import it from './it.json';
import nl from './nl.json';

export const LANGUAGES = ['en', 'de', 'es', 'it', 'nl'] as const;
export type Lang = (typeof LANGUAGES)[number];
export type Key = keyof typeof en;

const DICT: Record<Lang, Record<string, string>> = { en, de, es, it, nl };

// The language from the app's preference (for example "de" or "de-DE"). Anything else is English.
export const langFrom = (code: unknown): Lang => {
  const base = typeof code === 'string' ? code.trim().toLowerCase().split('-')[0] : '';
  return (LANGUAGES as readonly string[]).includes(base) ? (base as Lang) : 'en';
};

let current = $state<Lang>('en');

export const setLanguage = (code: unknown): void => {
  current = langFrom(code);
};

export const currentLanguage = (): Lang => current;

// The text for a key, with {name} placeholders filled from vars.
export const t = (key: Key, vars: Record<string, string | number> = {}): string => {
  const text = DICT[current][key] ?? en[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name) => (name in vars ? String(vars[name]) : `{${name}}`));
};

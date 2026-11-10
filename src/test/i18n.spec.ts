import { describe, expect, it } from 'vitest';
import en from '../i18n/en.json';
import de from '../i18n/de.json';
import es from '../i18n/es.json';
import it_ from '../i18n/it.json';
import nl from '../i18n/nl.json';
import { langFrom, t, setLanguage } from '../i18n/index.svelte';

describe('plugin language', () => {
  it('has the same keys in every language', () => {
    const keys = Object.keys(en).sort();
    for (const d of [de, es, it_, nl]) expect(Object.keys(d).sort()).toEqual(keys);
  });
  it('maps the app language, and falls back to English', () => {
    expect(langFrom('de')).toBe('de');
    expect(langFrom('nl-NL')).toBe('nl');
    expect(langFrom('zh-cn')).toBe('en');
    expect(langFrom(undefined)).toBe('en');
  });
  it('fills the placeholders', () => {
    setLanguage('de');
    expect(t('noWordsDays', { days: 30 })).toBe('In den letzten 30 Tagen noch keine Wörter.');
    setLanguage('en');
    expect(t('noWordsDays', { days: 30 })).toBe('No words in the last 30 days yet.');
  });
});

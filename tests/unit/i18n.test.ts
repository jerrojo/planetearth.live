import { describe, it, expect, beforeEach } from 'vitest';
import { DICTS, LOCALES, DEFAULT_LOCALE, type StringKey } from '../../src/i18n/dictionaries';
import { getLocale, setLocale, t, applyStaticI18n, subscribe, initI18n } from '../../src/i18n';

beforeEach(() => {
    // Reset DOM and storage between tests.
    document.documentElement.lang = '';
    document.body.innerHTML = '';
    try { localStorage.removeItem('pel:locale'); } catch { /* ignore */ }
    // Force the module back to the default without exposing internals.
    setLocale(DEFAULT_LOCALE);
});

describe('i18n · dictionaries integrity', () => {
    it('every declared key exists in every locale', () => {
        const esKeys = Object.keys(DICTS.es) as StringKey[];
        const enKeys = Object.keys(DICTS.en) as StringKey[];
        // Both dictionaries must cover the same set of keys.
        for (const k of esKeys) {
            expect(DICTS.en[k], `missing EN for ${k}`).toBeDefined();
            expect(DICTS.en[k].length, `empty EN for ${k}`).toBeGreaterThan(0);
        }
        for (const k of enKeys) {
            expect(DICTS.es[k], `missing ES for ${k}`).toBeDefined();
            expect(DICTS.es[k].length, `empty ES for ${k}`).toBeGreaterThan(0);
        }
    });

    it('LOCALES array matches DICTS keys', () => {
        expect(LOCALES.sort()).toEqual(Object.keys(DICTS).sort());
    });
});

describe('i18n · t()', () => {
    it('returns the template verbatim when no params are provided', () => {
        expect(t('app.tagline')).toBe(DICTS.es['app.tagline']);
    });

    it('interpolates {name}-style placeholders', () => {
        const s = t('status.partial', { n: 8, total: 14 });
        expect(s).toContain('8');
        expect(s).toContain('14');
        expect(s).not.toContain('{n}');
        expect(s).not.toContain('{total}');
    });

    it('leaves unknown placeholders untouched', () => {
        const s = t('status.partial', { n: 1 });
        expect(s).toContain('{total}');
    });

    it('falls back to default locale for an unknown key rather than crashing', () => {
        const unknown = 'does.not.exist' as StringKey;
        expect(typeof t(unknown)).toBe('string');
    });
});

describe('i18n · setLocale', () => {
    it('switches locale and fires subscribers', () => {
        let called = 0;
        const unsub = subscribe(() => { called++; });
        setLocale('en');
        expect(getLocale()).toBe('en');
        expect(called).toBeGreaterThanOrEqual(1);
        expect(t('app.loading')).toBe('Loading');
        unsub();
    });

    it('updates document.documentElement.lang', () => {
        setLocale('en');
        expect(document.documentElement.lang).toBe('en');
        setLocale('es');
        expect(document.documentElement.lang).toBe('es');
    });

    it('is a no-op for unknown locales (fails safe)', () => {
        setLocale('en');
        // @ts-expect-error intentionally bad input
        setLocale('xx');
        expect(getLocale()).toBe('en');
    });
});

describe('i18n · applyStaticI18n', () => {
    it('rewrites data-i18n / data-i18n-aria / data-i18n-title in a subtree', () => {
        document.body.innerHTML = `
            <span data-i18n="app.loading" id="s1">placeholder</span>
            <button data-i18n-aria="nav.close" id="b1">X</button>
            <button data-i18n-title="a11y.settings" id="b2">s</button>
        `;
        setLocale('en');
        applyStaticI18n();
        expect(document.getElementById('s1')?.textContent).toBe('Loading');
        expect(document.getElementById('b1')?.getAttribute('aria-label')).toBe('Close');
        expect(document.getElementById('b2')?.getAttribute('title')).toBe('Settings');
    });

    it('is idempotent — running twice yields the same result', () => {
        document.body.innerHTML = `<span data-i18n="app.loading"></span>`;
        setLocale('en');
        applyStaticI18n();
        applyStaticI18n();
        expect(document.querySelector('[data-i18n]')?.textContent).toBe('Loading');
    });
});

describe('i18n · initI18n', () => {
    it('honours ?lang= URL parameter over default', () => {
        // jsdom allows pushState to change the URL.
        history.replaceState(null, '', '/?lang=en');
        const locale = initI18n();
        expect(locale).toBe('en');
        expect(getLocale()).toBe('en');
        history.replaceState(null, '', '/');
    });
});

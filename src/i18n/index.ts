/**
 * Tiny, dependency-free i18n runtime.
 *
 * Public API:
 *   - `getLocale()` / `setLocale(locale)` — read or change the active language.
 *   - `t(key, params?)` — resolve a string with optional `{name}` interpolation.
 *   - `subscribe(fn)` — listen for locale changes (for re-rendering UI).
 *   - `applyStaticI18n()` — one-shot pass that rewrites any DOM element with
 *     `data-i18n="…"` or `data-i18n-aria="…"`, keeping index.html clean.
 *
 * Locale selection precedence:
 *   1. URL query (`?lang=en`) — for cross-linking from EN sites.
 *   2. localStorage (`pel:locale`) — user's saved choice.
 *   3. `<html lang>` attribute on the document.
 *   4. `navigator.language` prefix.
 *   5. DEFAULT_LOCALE.
 */

import { DEFAULT_LOCALE, DICTS, LOCALES, type Locale, type StringKey } from './dictionaries';

// Re-export so consumers can write `import { LOCALES, setLocale, t } from '../i18n'`
// without needing to reach into the dictionaries module.
export { LOCALES, DEFAULT_LOCALE, DICTS } from './dictionaries';
export type { Locale, StringKey } from './dictionaries';

const STORAGE_KEY = 'pel:locale';
let current: Locale = DEFAULT_LOCALE;
const listeners = new Set<() => void>();

export function getLocale(): Locale {
    return current;
}

export function setLocale(locale: Locale): void {
    if (!LOCALES.includes(locale)) return;
    if (locale === current) return;
    current = locale;
    try { localStorage.setItem(STORAGE_KEY, locale); } catch { /* ignore */ }
    if (typeof document !== 'undefined') {
        document.documentElement.lang = locale;
    }
    for (const l of listeners) {
        try { l(); } catch { /* ignore */ }
    }
}

export function subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

/** Interpolate `{key}` placeholders. Missing params are left in place. */
function interpolate(template: string, params?: Record<string, string | number>): string {
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (_, k: string) => {
        const v = params[k];
        return v === undefined ? `{${k}}` : String(v);
    });
}

export function t(key: StringKey, params?: Record<string, string | number>): string {
    const dict = DICTS[current] ?? DICTS[DEFAULT_LOCALE];
    const template = dict[key] ?? DICTS[DEFAULT_LOCALE][key] ?? key;
    return interpolate(template, params);
}

/* ────────────────── Boot-time detection ────────────────── */

function detectLocale(): Locale {
    if (typeof window === 'undefined') return DEFAULT_LOCALE;
    try {
        const url = new URL(window.location.href);
        const q = url.searchParams.get('lang');
        if (q && LOCALES.includes(q as Locale)) return q as Locale;
    } catch { /* ignore */ }
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && LOCALES.includes(saved as Locale)) return saved as Locale;
    } catch { /* ignore */ }
    const htmlLang = document.documentElement.lang?.slice(0, 2).toLowerCase();
    if (htmlLang && LOCALES.includes(htmlLang as Locale)) return htmlLang as Locale;
    const navLang = navigator.language?.slice(0, 2).toLowerCase();
    if (navLang && LOCALES.includes(navLang as Locale)) return navLang as Locale;
    return DEFAULT_LOCALE;
}

export function initI18n(): Locale {
    current = detectLocale();
    if (typeof document !== 'undefined') {
        document.documentElement.lang = current;
    }
    return current;
}

/**
 * Rewrite any DOM element carrying `data-i18n` / `data-i18n-aria` attributes.
 * Safe to call multiple times and on any subtree (defaults to document).
 */
export function applyStaticI18n(root: ParentNode = document): void {
    const nodes = root.querySelectorAll<HTMLElement>('[data-i18n], [data-i18n-aria], [data-i18n-title]');
    nodes.forEach((el) => {
        const textKey = el.dataset['i18n'] as StringKey | undefined;
        if (textKey) el.textContent = t(textKey);
        const ariaKey = el.dataset['i18nAria'] as StringKey | undefined;
        if (ariaKey) el.setAttribute('aria-label', t(ariaKey));
        const titleKey = el.dataset['i18nTitle'] as StringKey | undefined;
        if (titleKey) el.setAttribute('title', t(titleKey));
    });
}

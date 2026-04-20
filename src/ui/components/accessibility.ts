import { getLocale, setLocale, LOCALES, LOCALE_LABELS, t, applyStaticI18n } from '../../i18n';
import type { Locale, StringKey } from '../../i18n/dictionaries';
import { isLayerEnabled, setLayer, type LayerKey } from '../../state/layers';

export function initAccessibility(): () => boolean {
    const a11yToggle = document.getElementById('a11yToggle')!;
    const a11yPanel = document.getElementById('a11yPanel')!;
    const toggleMotion = document.getElementById('toggleMotion')!;
    const toggleContrast = document.getElementById('toggleContrast')!;
    const fontSegBtns = document.querySelectorAll<HTMLButtonElement>('.font-seg-btn');

    // ── Language switcher (injected dynamically so existing HTML stays clean) ──
    (function injectLanguageSwitcher(): void {
        if (a11yPanel.querySelector('.lang-seg')) return;
        const row = document.createElement('div');
        row.className = 'a11y-row';
        const labelSpan = document.createElement('span');
        labelSpan.className = 'a11y-label';
        labelSpan.textContent = t('a11y.language');
        labelSpan.dataset['i18n'] = 'a11y.language';
        const seg = document.createElement('div');
        seg.className = 'font-seg lang-seg';
        seg.setAttribute('role', 'radiogroup');
        seg.setAttribute('aria-label', t('a11y.language'));
        for (const loc of LOCALES) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'font-seg-btn lang-btn';
            btn.setAttribute('role', 'radio');
            btn.dataset['lang'] = loc;
            // Use the language code for compactness (ES, EN, PT, FR, DE, ZH, JA, AR)
            // and expose the native name via `title` so a hover tells you what it is.
            btn.textContent = loc.toUpperCase();
            btn.setAttribute('title', LOCALE_LABELS[loc]);
            btn.setAttribute('aria-label', LOCALE_LABELS[loc]);
            if (loc === getLocale()) {
                btn.classList.add('active');
                btn.setAttribute('aria-checked', 'true');
            } else {
                btn.setAttribute('aria-checked', 'false');
            }
            btn.addEventListener('click', () => {
                setLocale(loc as Locale);
                seg.querySelectorAll<HTMLButtonElement>('.font-seg-btn').forEach(b => {
                    const isActive = b.dataset['lang'] === loc;
                    b.classList.toggle('active', isActive);
                    b.setAttribute('aria-checked', String(isActive));
                });
                applyStaticI18n();
            });
            seg.appendChild(btn);
        }
        row.appendChild(labelSpan);
        row.appendChild(seg);
        a11yPanel.appendChild(row);
    })();

    // ── Layers section ──────────────────────────────────────────────────────
    // Independent toggles for optional globe overlays. Stacked in one column —
    // each row has the label on the left and a toggle switch on the right, same
    // visual grammar as "Reduce motion" / "High contrast" so the pattern reads.
    (function injectLayersSection(): void {
        if (a11yPanel.querySelector('.layers-header')) return;

        const header = document.createElement('div');
        header.className = 'a11y-row layers-header';
        const headerLabel = document.createElement('span');
        headerLabel.className = 'a11y-label a11y-section-label';
        headerLabel.textContent = t('a11y.layers');
        headerLabel.dataset['i18n'] = 'a11y.layers';
        header.appendChild(headerLabel);
        a11yPanel.appendChild(header);

        const layers: Array<{ key: LayerKey; labelKey: StringKey }> = [
            { key: 'windFlow',     labelKey: 'a11y.layerWind' },
            { key: 'naturalEvents', labelKey: 'a11y.layerEvents' },
            { key: 'satellites',   labelKey: 'a11y.layerSatellites' },
            { key: 'countries',    labelKey: 'a11y.layerCountries' },
        ];

        for (const { key, labelKey } of layers) {
            const row = document.createElement('div');
            row.className = 'a11y-row';

            const label = document.createElement('span');
            label.className = 'a11y-label';
            label.textContent = t(labelKey);
            label.dataset['i18n'] = labelKey;

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'toggle-switch';
            btn.setAttribute('role', 'switch');
            const initial = isLayerEnabled(key);
            btn.setAttribute('aria-checked', String(initial));
            btn.setAttribute('aria-label', t(labelKey));
            btn.dataset['i18nAria'] = labelKey;
            const thumb = document.createElement('span');
            thumb.className = 'toggle-thumb';
            btn.appendChild(thumb);

            btn.addEventListener('click', () => {
                const next = btn.getAttribute('aria-checked') !== 'true';
                btn.setAttribute('aria-checked', String(next));
                setLayer(key, next);
            });

            row.appendChild(label);
            row.appendChild(btn);
            a11yPanel.appendChild(row);
        }
    })();

    function toggleA11yPanel(open?: boolean): void {
        const shouldOpen = typeof open === 'boolean' ? open : !a11yPanel.classList.contains('open');
        a11yPanel.classList.toggle('open', shouldOpen);
        a11yToggle.setAttribute('aria-expanded', String(shouldOpen));
        if (!shouldOpen) a11yToggle.focus();
    }

    a11yToggle.addEventListener('click', () => toggleA11yPanel());

    // Font size
    fontSegBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            fontSegBtns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-checked', 'false'); });
            btn.classList.add('active');
            btn.setAttribute('aria-checked', 'true');
            const sz = btn.dataset.size!;
            document.documentElement.classList.remove('font-small', 'font-large');
            if (sz === 'small') document.documentElement.classList.add('font-small');
            else if (sz === 'large') document.documentElement.classList.add('font-large');
            localStorage.setItem('planetearth-font-size', sz);
        });
    });

    // Reduced motion toggle
    toggleMotion.addEventListener('click', () => {
        const on = toggleMotion.getAttribute('aria-checked') !== 'true';
        toggleMotion.setAttribute('aria-checked', String(on));
        document.documentElement.classList.toggle('reduced-motion', on);
        localStorage.setItem('planetearth-reduced-motion', on ? '1' : '0');
    });

    // High contrast toggle
    toggleContrast.addEventListener('click', () => {
        const on = toggleContrast.getAttribute('aria-checked') !== 'true';
        toggleContrast.setAttribute('aria-checked', String(on));
        document.documentElement.classList.toggle('high-contrast', on);
        localStorage.setItem('planetearth-high-contrast', on ? '1' : '0');
    });

    // Restore saved preferences
    const fs = localStorage.getItem('planetearth-font-size');
    if (fs && fs !== 'medium') {
        document.documentElement.classList.add(fs === 'small' ? 'font-small' : 'font-large');
        fontSegBtns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-checked', 'false'); });
        const match = document.querySelector<HTMLButtonElement>(`.font-seg-btn[data-size="${fs}"]`);
        if (match) { match.classList.add('active'); match.setAttribute('aria-checked', 'true'); }
    }
    if (localStorage.getItem('planetearth-reduced-motion') === '1' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.documentElement.classList.add('reduced-motion');
        toggleMotion.setAttribute('aria-checked', 'true');
    }
    if (localStorage.getItem('planetearth-high-contrast') === '1') {
        document.documentElement.classList.add('high-contrast');
        toggleContrast.setAttribute('aria-checked', 'true');
    }

    // Return isReducedMotion check
    return () => document.documentElement.classList.contains('reduced-motion');
}

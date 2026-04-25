/**
 * Country Planet-Lens panel.
 *
 * Reuses the existing #panel DOM (same dialog, close button, animation) but
 * renders country-specific content instead of category content:
 *   - Title: country name + traffic-light banner with composite score
 *   - 7 Planet-Lens pillars with mini-bars (climate, forests, biodiv,
 *     protected, pollution, agriculture, governance)
 *   - Top 5 gaps (current vs target)
 *   - Recent actions (last 12 months of country-specific events)
 *   - Three universal Acciones expandable sections (Globales / Gubernamentales
 *     / Personales) — same content on every country panel by design.
 *
 * Open: showCountryPanel(iso3). Close: shared #closeBtn already wired in
 * initPanel(); no extra wiring needed.
 */
import { getLocale, subscribe as subscribeLocale } from '../../i18n';
import { registerPanelTakeoverHook, clearCategoryPanelState } from './panel';
import {
    loadCountry,
    getCountryIndex,
    COUNTRIES,
    type CountryProfile,
    type TrafficLight,
} from '../../data/countries-loader';

// ── State ──────────────────────────────────────────────────────────────

let currentIso: string | null = null;
let currentProfile: CountryProfile | null = null;

// Re-render on locale change so all bilingual fields swap.
subscribeLocale(() => {
    if (currentIso && currentProfile) renderInto(currentProfile);
});

// Cross-clearing: when the category panel takes over (showPanel) or the
// shared close button fires, drop our state so we don't re-render stale
// country content on the next locale toggle.
registerPanelTakeoverHook(() => {
    currentIso = null;
    currentProfile = null;
});

// ── Pillar metadata (display order + weights + bilingual labels) ───────

interface PillarMeta {
    key: string;
    weight: number;
    label_en: string;
    label_es: string;
}

const PILLARS: PillarMeta[] = [
    { key: 'climate',         weight: 0.25, label_en: 'Climate',         label_es: 'Clima' },
    { key: 'forests_land',    weight: 0.15, label_en: 'Forests / Land',  label_es: 'Bosques / Suelo' },
    { key: 'biodiversity',    weight: 0.15, label_en: 'Biodiversity',    label_es: 'Biodiversidad' },
    { key: 'env_governance',  weight: 0.15, label_en: 'Governance',      label_es: 'Gobernanza' },
    { key: 'protected_areas', weight: 0.10, label_en: 'Protected areas', label_es: 'Áreas protegidas' },
    { key: 'pollution',       weight: 0.10, label_en: 'Pollution',       label_es: 'Contaminación' },
    { key: 'agriculture',     weight: 0.10, label_en: 'Agriculture',     label_es: 'Agricultura' },
];

// ── Color tokens for traffic light ─────────────────────────────────────

const LIGHT_HEX: Record<TrafficLight, string> = {
    green: '#5ae89f',
    yellow: '#ffc94d',
    red: '#ff6577',
};

const LIGHT_LABEL: Record<TrafficLight, { en: string; es: string }> = {
    green:  { en: 'on track',     es: 'en buen camino' },
    yellow: { en: 'mixed signal', es: 'señal mixta' },
    red:    { en: 'major gaps',   es: 'brechas severas' },
};

// ── Rendering helpers ──────────────────────────────────────────────────

function escapeHtml(s: string): string {
    return s.replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]!));
}

function pillarBar(score: number, color: string): string {
    const clamped = Math.max(0, Math.min(100, score));
    return `<div class="cp-pillar-bar"><div class="cp-pillar-fill" style="width:${clamped}%;background:${color}"></div></div>`;
}

// ── Main render ────────────────────────────────────────────────────────

function renderInto(profile: CountryProfile): void {
    const lang = (getLocale() === 'en' ? 'en' : 'es') as 'en' | 'es';
    const idx = getCountryIndex(profile.identity.iso_a3);
    const name = lang === 'es' ? (profile.identity['name_es'] as string ?? profile.identity.name_en) : profile.identity.name_en;
    const score = profile.score.value;
    const light = profile.score.traffic_light;
    const lightHex = LIGHT_HEX[light];
    const lightLabel = LIGHT_LABEL[light][lang];

    // Title + subtitle
    const panelTitle = document.getElementById('panelTitle');
    if (panelTitle) {
        panelTitle.style.color = lightHex;
        panelTitle.textContent = name;
    }
    const subtitle = document.getElementById('panelSubtitle');
    if (subtitle) {
        const region = idx?.region ?? '';
        subtitle.textContent = lang === 'es'
            ? `Lente Planeta · ${region}`
            : `Planet Lens · ${region}`;
    }

    let h = '';

    // Country switcher — small colored dots for all 30, click to switch.
    // Solves "panel covers part of the globe" UX: user can swap countries
    // without needing to find the light on the canvas.
    h += `<div class="cp-switcher" role="group" aria-label="${lang === 'es' ? 'Cambiar de país' : 'Switch country'}">`;
    for (const c of COUNTRIES) {
        const isActive = c.iso_a3 === profile.identity.iso_a3;
        const cName = lang === 'es' ? c.name_es : c.name_en;
        const cHex = LIGHT_HEX[c.traffic_light];
        h += `<button type="button" class="cp-switcher-dot${isActive ? ' is-active' : ''}" `
           + `data-iso="${c.iso_a3}" `
           + `style="--cp-dot:${cHex}" `
           + `title="${escapeHtml(cName)} · ${c.score}" `
           + `aria-label="${escapeHtml(cName)}, ${c.score}, ${c.traffic_light}" `
           + (isActive ? `aria-current="true"` : '')
           + `></button>`;
    }
    h += `</div>`;

    // Score banner
    h += `<div class="cp-score-banner" style="border-color:${lightHex}">`;
    h += `<div class="cp-score-value" style="color:${lightHex}">${score}</div>`;
    h += `<div class="cp-score-meta">`;
    h += `<div class="cp-score-light"><span class="cp-light-dot" style="background:${lightHex}"></span> ${escapeHtml(lightLabel)}</div>`;
    h += `<div class="cp-score-scale">${lang === 'es' ? '0 – 100 · objetivo ≥ 65' : '0 – 100 · target ≥ 65'}</div>`;
    h += `</div>`;
    h += `</div>`;

    // Pillars
    h += `<div class="section-title">${lang === 'es' ? '7 pilares' : '7 pillars'}</div>`;
    h += `<div class="cp-pillars">`;
    for (const p of PILLARS) {
        const pillar = profile.pillars[p.key] as { value?: number; score?: number; rationale?: string } | undefined;
        const pscore = pillar?.value ?? pillar?.score ?? 0;
        const label = lang === 'es' ? p.label_es : p.label_en;
        h += `<div class="cp-pillar">`;
        h += `<div class="cp-pillar-row">`;
        h += `<span class="cp-pillar-label">${escapeHtml(label)}</span>`;
        h += `<span class="cp-pillar-weight">${Math.round(p.weight * 100)}%</span>`;
        h += `<span class="cp-pillar-score">${pscore}</span>`;
        h += `</div>`;
        h += pillarBar(pscore as number, lightHex);
        h += `</div>`;
    }
    h += `</div>`;

    // Top gaps
    if (profile.top_gaps && profile.top_gaps.length > 0) {
        h += `<div class="section-title">${lang === 'es' ? 'Top 5 brechas' : 'Top 5 gaps'}</div>`;
        h += `<ol class="cp-gaps">`;
        for (const g of profile.top_gaps.slice(0, 5)) {
            const dim = (g['dimension'] as string) ?? (g['title_' + lang] as string) ?? '';
            const cur = (g['current'] as string) ?? '';
            const tgt = (g['target'] as string) ?? '';
            h += `<li class="cp-gap">`;
            h += `<div class="cp-gap-dim">${escapeHtml(dim)}</div>`;
            if (cur) h += `<div class="cp-gap-line"><span class="cp-gap-tag cp-gap-current">${lang === 'es' ? 'hoy' : 'now'}</span> ${escapeHtml(cur)}</div>`;
            if (tgt) h += `<div class="cp-gap-line"><span class="cp-gap-tag cp-gap-target">${lang === 'es' ? 'objetivo' : 'target'}</span> ${escapeHtml(tgt)}</div>`;
            h += `</li>`;
        }
        h += `</ol>`;
    }

    // Recent actions
    if (profile.recent_actions && profile.recent_actions.length > 0) {
        h += `<div class="section-title">${lang === 'es' ? 'Acciones recientes' : 'Recent actions'}</div>`;
        h += `<ul class="cp-recent">`;
        for (const a of profile.recent_actions.slice(0, 4)) {
            const date = (a['date'] as string) ?? '';
            const action = (a['action'] as string) ?? '';
            const type = (a['type'] as string) ?? 'neutral';
            const dot = type === 'positive' ? '#5ae89f' : type === 'negative' ? '#ff6577' : '#aaa';
            h += `<li class="cp-recent-item"><span class="cp-recent-dot" style="background:${dot}"></span><span class="cp-recent-date">${escapeHtml(date)}</span><span class="cp-recent-text">${escapeHtml(action)}</span></li>`;
        }
        h += `</ul>`;
    }

    // Note: per-category Individual / Governmental / Global action lists now
    // live inside each of the 12 category panels (sidebar). The country panel
    // intentionally focuses on country-specific signal: score, pillars, gaps
    // and recent actions. Open a category from the sidebar to see actions.

    const content = document.getElementById('panelContent');
    if (content) {
        content.innerHTML = h;

        // Wire the country switcher dots (event delegation — re-rendered each time)
        const switcher = content.querySelector('.cp-switcher');
        if (switcher) {
            switcher.addEventListener('click', (ev) => {
                const t = (ev.target as HTMLElement).closest('.cp-switcher-dot') as HTMLElement | null;
                if (!t) return;
                const iso = t.dataset['iso'];
                if (iso && iso !== profile.identity.iso_a3) {
                    void showCountryPanel(iso);
                }
            });
        }
    }
}

// ── Public API ─────────────────────────────────────────────────────────

export async function showCountryPanel(iso3: string): Promise<void> {
    // Take ownership of #panel: tell the category panel to drop its state so
    // a future locale change doesn't try to re-render the previously open
    // category over our country content.
    clearCategoryPanelState();

    currentIso = iso3.toUpperCase();
    const profile = await loadCountry(currentIso);
    if (!profile) {
        console.warn(`[country-panel] no profile for ${iso3}`);
        return;
    }
    currentProfile = profile;

    renderInto(profile);

    const panel = document.getElementById('panel');
    if (!panel) return;
    const wasOpen = panel.classList.contains('active');
    panel.classList.add('active');
    panel.setAttribute('aria-modal', 'true');
    if (!wasOpen) {
        const close = document.getElementById('closeBtn');
        close?.focus();
    }
}

/** Hook into the shared close mechanism so country state is cleared. */
export function clearCountryPanelState(): void {
    currentIso = null;
    currentProfile = null;
}

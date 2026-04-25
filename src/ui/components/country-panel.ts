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
import {
    loadCountry,
    getCountryIndex,
    COUNTRIES,
    GLOBAL_ACTIONS,
    GOVERNMENTAL_ACTIONS,
    PERSONAL_ACTIONS,
    type CountryProfile,
    type ActionItem,
    type ActionList,
    type TrafficLight,
} from '../../data/countries-loader';

// ── State ──────────────────────────────────────────────────────────────

let currentIso: string | null = null;
let currentProfile: CountryProfile | null = null;

// Re-render on locale change so all bilingual fields swap.
subscribeLocale(() => {
    if (currentIso && currentProfile) renderInto(currentProfile);
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

function actionItemHtml(a: ActionItem, lang: 'en' | 'es'): string {
    const title = lang === 'es' ? a.title_es : a.title_en;
    const what = lang === 'es' ? (a.what_es ?? '') : (a.what_en ?? '');
    const why = lang === 'es' ? (a.why_matters_es ?? '') : (a.why_matters_en ?? '');
    return `<div class="cp-action">
        <div class="cp-action-rank">${a.rank}</div>
        <div class="cp-action-body">
            <div class="cp-action-title">${escapeHtml(title)}</div>
            ${what ? `<div class="cp-action-what">${escapeHtml(what)}</div>` : ''}
            ${why ? `<div class="cp-action-why"><em>${escapeHtml(why)}</em></div>` : ''}
            ${a.source ? `<a class="cp-action-source" href="${escapeHtml(a.source)}" target="_blank" rel="noopener">${escapeHtml(a.source.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</a>` : ''}
        </div>
    </div>`;
}

function accordionHtml(
    id: string,
    icon: string,
    title: string,
    body: string,
): string {
    return `<details class="cp-acciones-section" id="${id}">
        <summary class="cp-acciones-summary">
            <span class="cp-acciones-icon">${icon}</span>
            <span class="cp-acciones-title">${escapeHtml(title)}</span>
            <span class="cp-acciones-chevron" aria-hidden="true">▾</span>
        </summary>
        <div class="cp-acciones-body">${body}</div>
    </details>`;
}

function accionesSection(list: ActionList, lang: 'en' | 'es'): string {
    return list.items
        .slice()
        .sort((a, b) => a.rank - b.rank)
        .map(item => actionItemHtml(item, lang))
        .join('');
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
    h += `<div class="cp-switcher" role="tablist" aria-label="${lang === 'es' ? 'Cambiar de país' : 'Switch country'}">`;
    for (const c of COUNTRIES) {
        const isActive = c.iso_a3 === profile.identity.iso_a3;
        const cName = lang === 'es' ? c.name_es : c.name_en;
        const cHex = LIGHT_HEX[c.traffic_light];
        h += `<button type="button" class="cp-switcher-dot${isActive ? ' is-active' : ''}" `
           + `data-iso="${c.iso_a3}" `
           + `style="--cp-dot:${cHex}" `
           + `title="${escapeHtml(cName)} · ${c.score}" `
           + `aria-label="${escapeHtml(cName)}, ${c.score}, ${c.traffic_light}" `
           + `aria-selected="${isActive}"></button>`;
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

    // ── Universal Acciones ─────────────────────────────────────────────

    h += `<div class="cp-acciones-divider"></div>`;
    h += `<div class="section-title">${lang === 'es' ? 'Acciones' : 'Actions'}</div>`;
    h += `<div class="cp-acciones-intro">${lang === 'es'
        ? 'Estas 5 acciones por categoría aplican a todos los países.'
        : 'These 5 actions per category apply to every country.'}</div>`;

    h += accordionHtml(
        'cp-acciones-globales',
        '🌍',
        lang === 'es' ? 'Acciones Globales' : 'Global Actions',
        `<div class="cp-acciones-universal-label">${lang === 'es' ? 'Para todos los países' : 'For every country'}</div>`
            + accionesSection(GLOBAL_ACTIONS, lang),
    );

    // Government actions: universal top 5 + country-specific gaps (priorities for THIS country).
    let govBody = `<div class="cp-acciones-universal-label">${lang === 'es' ? 'Para todos los gobiernos' : 'For every government'}</div>`;
    govBody += accionesSection(GOVERNMENTAL_ACTIONS, lang);
    if (profile.top_gaps && profile.top_gaps.length > 0) {
        const countryName = lang === 'es' ? (profile.identity['name_es'] as string) : profile.identity.name_en;
        govBody += `<div class="cp-acciones-country-divider"></div>`;
        govBody += `<div class="cp-acciones-country-label">`
            + (lang === 'es' ? `Específicas para ${escapeHtml(countryName)}` : `Specific to ${escapeHtml(countryName)}`)
            + `</div>`;
        govBody += `<ol class="cp-country-gaps">`;
        for (const g of profile.top_gaps.slice(0, 5)) {
            const dim = (g['dimension'] as string) ?? (g['title_' + lang] as string) ?? '';
            const cur = (g['current'] as string) ?? '';
            const tgt = (g['target'] as string) ?? '';
            const src = (g['source'] as string) ?? '';
            govBody += `<li class="cp-country-gap-item">`;
            govBody += `<div class="cp-country-gap-dim">${escapeHtml(dim)}</div>`;
            if (cur) govBody += `<div class="cp-country-gap-line"><span class="cp-gap-tag cp-gap-current">${lang === 'es' ? 'hoy' : 'now'}</span> ${escapeHtml(cur)}</div>`;
            if (tgt) govBody += `<div class="cp-country-gap-line"><span class="cp-gap-tag cp-gap-target">${lang === 'es' ? 'objetivo' : 'target'}</span> ${escapeHtml(tgt)}</div>`;
            if (src) govBody += `<a class="cp-action-source" href="${escapeHtml(src)}" target="_blank" rel="noopener">${escapeHtml(src.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</a>`;
            govBody += `</li>`;
        }
        govBody += `</ol>`;
    }
    h += accordionHtml(
        'cp-acciones-gubernamentales',
        '🏛',
        lang === 'es' ? 'Acciones Gubernamentales' : 'Governmental Actions',
        govBody,
    );

    h += accordionHtml(
        'cp-acciones-personales',
        '👤',
        lang === 'es' ? 'Acciones Personales' : 'Personal Actions',
        `<div class="cp-acciones-universal-label">${lang === 'es' ? 'Para toda persona' : 'For every person'}</div>`
            + accionesSection(PERSONAL_ACTIONS, lang),
    );

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

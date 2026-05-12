/**
 * Country strip — a horizontally-scrollable bar of 30 country chips placed
 * between the population counter and the category sidebar. Each chip:
 *
 *   ┌─────────┐
 *   │  🇨🇷  73  │   ← flag emoji + composite score
 *   │═════════│   ← traffic-light underline (green / yellow / red)
 *   └─────────┘
 *
 * Default sort is score descending so the story of the data — "one green,
 * a sea of yellow, a red tail" — reads at a glance. Clicking a chip opens
 * the existing #panel via showCountryPanel(iso3), which already supports
 * country-to-country switching via its internal switcher.
 *
 * The strip joins body.idle's fade-out group so it disappears with the
 * rest of the UI after 30s of no interaction.
 */
import { t, subscribe as subscribeLocale, getLocale } from '../../i18n';
import { COUNTRIES, type CountryIndexEntry, type TrafficLight } from '../../data/countries-loader';
import { showCountryPanel } from './country-panel';

// ── ISO-3 → flag emoji ──────────────────────────────────────────────────
// Maps the 30 covered countries to their ISO-2 (for the flag) since flag
// emoji is built from two regional-indicator letters derived from the
// ISO-3166-1 alpha-2 code.
const ISO3_TO_ISO2: Record<string, string> = {
    CHN: 'CN', USA: 'US', IND: 'IN', RUS: 'RU', JPN: 'JP',
    DEU: 'DE', KOR: 'KR', CAN: 'CA', MEX: 'MX', BRA: 'BR',
    IDN: 'ID', COD: 'CD', SAU: 'SA', ARE: 'AE', AUS: 'AU',
    NOR: 'NO', GBR: 'GB', ZAF: 'ZA', FRA: 'FR', ISL: 'IS',
    CRI: 'CR', DNK: 'DK', SWE: 'SE', URY: 'UY', NZL: 'NZ',
    CHL: 'CL', MAR: 'MA', VNM: 'VN', COL: 'CO', ECU: 'EC',
};

function flagEmoji(iso3: string): string {
    const iso2 = ISO3_TO_ISO2[iso3.toUpperCase()];
    if (!iso2) return '🏳️';
    const A = 0x1F1E6;
    const codePoints = [...iso2].map(c => A + (c.charCodeAt(0) - 'A'.charCodeAt(0)));
    return String.fromCodePoint(...codePoints);
}

const LIGHT_HEX: Record<TrafficLight, string> = {
    green: '#5ae89f',
    yellow: '#ffc94d',
    red: '#ff6577',
};

let containerEl: HTMLElement | null = null;

function render(): void {
    if (!containerEl) return;
    const lang = getLocale() === 'en' ? 'en' : 'es';

    // Sort by score descending — story tells itself
    const sorted: CountryIndexEntry[] = [...COUNTRIES].sort((a, b) => b.score - a.score);

    let html = `<div class="country-strip-label">${
        lang === 'es' ? '30 países · ordenados por salud' : '30 countries · sorted by health'
    }</div>`;
    html += `<div class="country-strip-track" role="list">`;
    for (const c of sorted) {
        const name = lang === 'es' ? c.name_es : c.name_en;
        const flag = flagEmoji(c.iso_a3);
        const color = LIGHT_HEX[c.traffic_light];
        html += `<button type="button" class="country-chip" role="listitem"
            data-iso="${c.iso_a3}"
            title="${name} · ${c.score} · ${c.traffic_light}"
            aria-label="${name}, score ${c.score}, ${c.traffic_light}"
            style="--chip-color:${color}">`
            + `<span class="country-chip-flag">${flag}</span>`
            + `<span class="country-chip-score">${c.score}</span>`
            + `</button>`;
    }
    html += `</div>`;
    containerEl.innerHTML = html;
}

function attachClickDelegation(): void {
    if (!containerEl) return;
    containerEl.addEventListener('click', (ev) => {
        const target = ev.target as HTMLElement;
        const chip = target.closest<HTMLElement>('.country-chip');
        if (!chip) return;
        const iso = chip.dataset['iso'];
        if (iso) void showCountryPanel(iso);
    });
}

/**
 * Mount the country strip into the page. Creates the <div> if it doesn't
 * exist, inserts it after the population counter and before the categories
 * sidebar so the visual hierarchy reads:
 *    [title] → [population] → [country strip] → [categories]
 */
export function initCountryStrip(): void {
    if (containerEl) return;

    containerEl = document.createElement('div');
    containerEl.className = 'country-strip';
    containerEl.id = 'countryStrip';
    containerEl.setAttribute('aria-label', t('country.strip.aria'));

    // Insert after the population counter so it sits in the top-stack.
    const pop = document.querySelector('.pop-counter');
    if (pop && pop.parentNode) {
        pop.parentNode.insertBefore(containerEl, pop.nextSibling);
    } else {
        document.body.appendChild(containerEl);
    }

    render();
    attachClickDelegation();

    // Re-render on locale change to swap names + labels.
    subscribeLocale(() => render());
}

import type { ActionItem } from '../../types';
import { categories, connections, categoryName, categorySubtitle, localizedActions, localizedImpact } from '../../data/categories';
import { POP_BASE, POP_EPOCH, POP_RATE, THRESHOLD } from '../../config/constants';
import { formatPop } from '../../utils/format';
import { setActiveCategory, clearActiveCategory } from './sidebar';
import { t, subscribe } from '../../i18n';

let lastFocusedBtn: HTMLElement | null = null;
let onCategoryChange: ((idx: number) => void) | null = null;
let onCategoryClose: (() => void) | null = null;
let currentOpenIdx: number | null = null;

// Re-render the open panel whenever the user switches language so its title,
// section headings, stat cards and connections badge track the active locale.
subscribe(() => {
    if (currentOpenIdx !== null) showPanel(currentOpenIdx);
});

export function setOnCategoryChange(fn: (idx: number) => void): void {
    onCategoryChange = fn;
}

export function setOnCategoryClose(fn: () => void): void {
    onCategoryClose = fn;
}

function getConnectedCategories(idx: number): number[] {
    const connected: Set<number> = new Set();
    for (const [from, to] of connections) {
        if (from === idx) connected.add(to);
        if (to === idx) connected.add(from);
    }
    return Array.from(connected);
}

function createStatCard(label: string, value: string, color: string): string {
    return `<div class="stat-card">
        <div class="stat-card-value" style="color:${color}">${value}</div>
        <div class="stat-card-label">${label}</div>
    </div>`;
}

/** Render a single action item with clean layout.
 *  Separates leading emoji from text for proper spacing. */
function renderAction(a: ActionItem, _catColor: string): string {
    const classes = ['activity'];
    if (a.startHere) classes.push('action-start-here');

    // Extract leading emoji from text to render in its own column
    const emojiMatch = a.text.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s*/u);
    const emoji = emojiMatch ? emojiMatch[1] : '';
    const textOnly = emojiMatch ? a.text.slice(emojiMatch[0].length) : a.text;

    const badge = a.startHere
        ? `<span class="action-badge badge-start">${t('action.startHereBadge')}</span>`
        : '';

    // Layout: [emoji] [badge + text] — emoji in fixed column, text flows naturally
    return `<div class="${classes.join(' ')}">` +
        `<span class="action-emoji">${emoji}</span>` +
        `<span class="action-content">${badge}${textOnly}</span>` +
        `</div>`;
}

/** Sort actions: startHere first, then preserve original order */
function sortActions(actions: ActionItem[]): ActionItem[] {
    return [...actions].sort((a, b) => {
        if (a.startHere && !b.startHere) return -1;
        if (!a.startHere && b.startHere) return 1;
        return 0;
    });
}

export function showPanel(idx: number): void {
    const cat = categories[idx];
    lastFocusedBtn = document.activeElement as HTMLElement;

    const panelTitle = document.getElementById('panelTitle')!;
    panelTitle.style.color = cat.color;
    panelTitle.textContent = categoryName(idx);
    document.getElementById('panelSubtitle')!.textContent = categorySubtitle(idx);

    // Dynamic 3.5% of live population
    const now = Date.now();
    const elapsedS = (now - POP_EPOCH) / 1000;
    const livePop = Math.floor(POP_BASE + elapsedS * POP_RATE);
    const tgt = Math.floor(livePop * THRESHOLD);
    const tgtM = (tgt / 1e6).toFixed(1);
    const tgt3 = formatPop(tgt * 3);
    const popLabel = `3.5% (${tgtM}M)`;
    const impactText = localizedImpact(idx).replace('{N}', popLabel).replace('{N3}', tgt3);

    let h = '';

    // Connected categories — names with colors instead of dots
    const connectedCats = getConnectedCategories(idx);
    if (connectedCats.length > 0) {
        const names = connectedCats.map(ci => {
            const c = categories[ci];
            return `<span class="conn-name" style="color:${c.color}">${categoryName(ci)}</span>`;
        }).join(', ');
        h += `<div class="connections-badge animate-in" style="animation-delay:0s">`;
        h += `<span class="connections-label">${t('panel.connectedWith')}</span> ${names}`;
        h += `</div>`;
    }

    // Related metrics highlight hint
    if (cat.relatedMetrics.length > 0) {
        h += `<div class="metric-bridge-hint animate-in" style="animation-delay:0.02s">`;
        h += `<span class="bridge-icon">📊</span> ${t('panel.metricsHighlighted')}`;
        h += `</div>`;
    }

    // Individual actions first — what's in our hands
    h += `<div class="section-title animate-in" style="animation-delay:0.04s">${t('panel.sectionIndividual')}</div>`;
    const sortedIndividual = sortActions(localizedActions(idx, 'individual'));
    sortedIndividual.forEach((a, i) => {
        h += `<div class="animate-in" style="animation-delay:${0.06 + i * 0.04}s">${renderAction(a, cat.color)}</div>`;
    });

    // Global actions — systemic changes
    h += `<div class="section-title animate-in" style="animation-delay:0.24s">${t('panel.sectionGlobal')}</div>`;
    const sortedGlobal = sortActions(localizedActions(idx, 'global'));
    sortedGlobal.forEach((a, i) => {
        h += `<div class="animate-in" style="animation-delay:${0.28 + i * 0.04}s">${renderAction(a, cat.color)}</div>`;
    });

    // Impact box
    h += `<div class="impact-box animate-in" style="animation-delay:0.48s">`;
    h += `<div class="impact-header"><strong>\uD83C\uDFAF ${t('panel.impactLabel')}</strong></div>`;
    h += `<div class="impact-text">${impactText}</div>`;
    h += `<div class="impact-meter">`;
    h += `<div class="impact-meter-fill" style="background:${cat.color}"></div>`;
    h += `</div>`;
    h += `<div class="impact-scale">`;
    h += `<span>0%</span><span>${t('panel.scaleMid')}</span><span>100%</span>`;
    h += `</div>`;
    h += `</div>`;

    // Stat cards
    h += `<div class="stat-cards animate-in" style="animation-delay:0.56s">`;
    h += createStatCard(t('panel.statPeopleNeeded'), `${tgtM}M`, cat.color);
    h += createStatCard(t('panel.statNetworkMultiplier'), 'x3\u201310', cat.color);
    h += createStatCard(t('panel.statConnections'), t('panel.statConnectionsValue', { count: connectedCats.length }), cat.color);
    h += `</div>`;

    document.getElementById('panelContent')!.innerHTML = h;

    const panel = document.getElementById('panel')!;
    const wasAlreadyOpen = panel.classList.contains('active');
    panel.classList.add('active');
    panel.setAttribute('aria-modal', 'true');
    setActiveCategory(idx);
    // Only steal focus on the initial open — skip on locale-change re-renders.
    if (!wasAlreadyOpen) document.getElementById('closeBtn')!.focus();

    // Highlight related metrics in dashboard
    highlightRelatedMetrics(cat.relatedMetrics);

    // Notify callback for globe effects
    currentOpenIdx = idx;
    if (onCategoryChange) onCategoryChange(idx);
}

/** Add glow class to related metric cards */
function highlightRelatedMetrics(indices: number[]): void {
    // Clear all highlights first
    document.querySelectorAll('.metric-highlighted').forEach(el => {
        el.classList.remove('metric-highlighted');
    });
    // Add highlights
    indices.forEach(i => {
        const el = document.querySelector(`.metric[data-metric-index="${i}"]`);
        if (el) el.classList.add('metric-highlighted');
    });
}

export function closePanel(): void {
    const panel = document.getElementById('panel')!;
    panel.classList.remove('active');
    panel.setAttribute('aria-modal', 'false');
    clearActiveCategory();
    if (lastFocusedBtn) lastFocusedBtn.focus();

    // Clear metric highlights
    document.querySelectorAll('.metric-highlighted').forEach(el => {
        el.classList.remove('metric-highlighted');
    });

    currentOpenIdx = null;
    // Notify callback
    if (onCategoryClose) onCategoryClose();
}

export function initPanel(): void {
    document.getElementById('closeBtn')!.addEventListener('click', e => {
        e.stopPropagation();
        closePanel();
    });
}

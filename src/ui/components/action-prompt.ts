/**
 * Action Prompt — "Acción del Día"
 *
 * Suggests ONE daily action based on the planet's worst-performing metric.
 * Discrete, collapsible widget — expands on click to show details.
 * No gamification, no commit button — just awareness and inspiration.
 */

import type { MetricDef } from '../../types';
import { categories, categoryName, localizedActions } from '../../data/categories';
import { calculateHealth } from './dashboard';
import { t, getLocale, subscribe } from '../../i18n';
import type { StringKey } from '../../i18n/dictionaries';

/* ────────────────── Types ────────────────── */

interface SelectedAction {
    text: string;
    catName: string;
    catColor: string;
}

export interface ActionPromptContext {
    show: () => void;
    el: HTMLElement;
}

/* ────────────────── Action Selection ────────────────── */

function selectAction(metrics: MetricDef[]): SelectedAction {
    // Find the 3 worst metrics (lowest health) — not just one
    const ranked = metrics.map((m, i) => ({ idx: i, health: calculateHealth(m) }))
        .sort((a, b) => a.health - b.health);
    const worstIndices = ranked.slice(0, 3).map(r => r.idx);
    const worstHealth = ranked[0].health;

    // Gather category INDICES connected to ANY of the 3 worst metrics.
    // We track indices (not cat objects) so downstream calls can use the
    // locale-aware helpers `categoryName(idx)` and `localizedActions(idx, …)`.
    const relatedIdxs = categories
        .map((_, i) => i)
        .filter(i => categories[i].relatedMetrics.some(ri => worstIndices.includes(ri)));
    const poolIdxs = relatedIdxs.length > 0
        ? relatedIdxs
        : categories.map((_, i) => i);

    // Build weighted candidate pool — prioritize high-impact actions
    // SOS-level metrics (health < 10%) → strongly prefer startHere + tiered actions
    const tierWeight: Record<string, number> = { S: 5, A: 4, B: 3, C: 2 };
    interface Weighted { action: SelectedAction; weight: number }
    const weighted: Weighted[] = [];

    for (const catIdx of poolIdxs) {
        const cat = categories[catIdx];
        const catName = categoryName(catIdx);
        // Include both global (systemic) and individual (actionable) actions
        // Global actions inspire awareness; individual actions are immediately doable
        const allActions = [
            ...localizedActions(catIdx, 'individual'),
            ...localizedActions(catIdx, 'global'),
        ];
        for (const action of allActions) {
            let weight = 1;
            if (action.startHere) weight += 4; // heavily favor "start here"
            if (action.tier) weight += tierWeight[action.tier] ?? 1;
            if (worstHealth < 10) weight *= 2; // double weight in SOS mode

            weighted.push({
                action: { text: action.text, catName, catColor: cat.color },
                weight,
            });
        }
    }

    if (weighted.length > 0) {
        // Weighted random selection — higher impact = higher probability
        const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
        let roll = Math.random() * totalWeight;
        for (const w of weighted) {
            roll -= w.weight;
            if (roll <= 0) return w.action;
        }
        return weighted[weighted.length - 1].action;
    }

    // Fallback — random category, random individual action, locale-aware
    const catIdx = Math.floor(Math.random() * categories.length);
    const cat = categories[catIdx];
    const individualActions = localizedActions(catIdx, 'individual');
    const action = individualActions[Math.floor(Math.random() * individualActions.length)];
    return {
        text: action.text,
        catName: categoryName(catIdx),
        catColor: cat.color,
    };
}

/* ────────────────── Mood phrase for worst metric ────────────────── */

// i18n key per metric index — resolved at call time so phrase language
// tracks the active locale. Missing keys fall back to the metric label.
const MOOD_PHRASE_KEYS: Record<number, StringKey> = {
    0:  'action.phrase.0',
    1:  'action.phrase.1',
    2:  'action.phrase.2',
    3:  'action.phrase.3',
    4:  'action.phrase.4',
    5:  'action.phrase.5',
    6:  'action.phrase.6',
    7:  'action.phrase.7',
    8:  'action.phrase.8',
    9:  'action.phrase.9',
    10: 'action.phrase.10',
};

function getWorstPhrase(metrics: MetricDef[]): { phrase: string; face: string } {
    let worstIdx = 0;
    let worstHealth = 100;
    metrics.forEach((m, i) => {
        const h = calculateHealth(m);
        if (h < worstHealth) { worstHealth = h; worstIdx = i; }
    });

    const m = metrics[worstIdx];
    // Locale-aware number formatting — 'es' uses "1.234,56", 'en' uses "1,234.56"
    const numLocale = getLocale() === 'en' ? 'en-US' : 'es-ES';
    const v = m.value < 100 ? m.value.toFixed(2) : Math.round(m.value).toLocaleString(numLocale);
    const key = MOOD_PHRASE_KEYS[worstIdx];
    const phrase = key ? t(key, { v }) : m.label.replace('{v}', v);
    const face = worstHealth >= 50 ? '😟' : worstHealth >= 25 ? '😰' : '🆘';
    return { phrase, face };
}

/* ────────────────── DOM — Collapsible Widget ────────────────── */

export function initActionPrompt(metrics: MetricDef[]): ActionPromptContext {
    let isExpanded = false;

    // ── Widget container ──
    const widget = document.createElement('div');
    widget.className = 'action-widget';
    widget.setAttribute('role', 'complementary');
    widget.setAttribute('aria-label', t('action.ofTheDay'));

    // Left accent bar (category color)
    const accent = document.createElement('div');
    accent.className = 'aw-accent';

    // ── Collapsed header (always visible) ──
    const header = document.createElement('div');
    header.className = 'aw-header';

    const headerIcon = document.createElement('span');
    headerIcon.className = 'aw-header-icon';
    headerIcon.textContent = '🌱';

    const headerLabel = document.createElement('span');
    headerLabel.className = 'aw-header-label';
    headerLabel.textContent = t('action.ofTheDay');

    const headerToggle = document.createElement('span');
    headerToggle.className = 'aw-header-toggle';
    headerToggle.textContent = '▼';
    headerToggle.setAttribute('aria-hidden', 'true');

    header.appendChild(headerIcon);
    header.appendChild(headerLabel);
    header.appendChild(headerToggle);

    // ── Expandable body ──
    const body = document.createElement('div');
    body.className = 'aw-body';

    // Top row: face + mood + category pill
    const topRow = document.createElement('div');
    topRow.className = 'aw-top-row';

    const faceEl = document.createElement('span');
    faceEl.className = 'aw-face';

    const moodText = document.createElement('span');
    moodText.className = 'aw-mood-text';

    const catPill = document.createElement('span');
    catPill.className = 'aw-cat-pill';

    topRow.appendChild(faceEl);
    topRow.appendChild(moodText);
    topRow.appendChild(catPill);

    // Action text
    const actionText = document.createElement('div');
    actionText.className = 'aw-action';

    // Bottom row: skip button only
    const bottomRow = document.createElement('div');
    bottomRow.className = 'aw-bottom-row';

    const skipBtn = document.createElement('button');
    skipBtn.className = 'aw-btn-skip';
    skipBtn.textContent = t('action.skipButton');
    skipBtn.setAttribute('aria-label', t('action.skipButtonAria'));

    bottomRow.appendChild(skipBtn);

    // Assemble body
    body.appendChild(topRow);
    body.appendChild(actionText);
    body.appendChild(bottomRow);

    // Assemble widget
    widget.appendChild(accent);
    widget.appendChild(header);
    widget.appendChild(body);

    /* ── Render ── */

    function renderAction(): void {
        const action = selectAction(metrics);
        const { phrase, face } = getWorstPhrase(metrics);

        faceEl.textContent = face;
        moodText.textContent = phrase;
        catPill.textContent = action.catName;
        catPill.style.borderColor = action.catColor;
        catPill.style.color = action.catColor;

        actionText.textContent = action.text;
        accent.style.background = action.catColor;

        // Update header icon based on mood
        headerIcon.textContent = face;
    }

    /* ── Toggle expand/collapse ── */

    function toggleExpand(): void {
        isExpanded = !isExpanded;
        widget.classList.toggle('aw-expanded', isExpanded);
    }

    header.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleExpand();
    });

    /* ── Events ── */

    function show(): void {
        renderAction();
        widget.classList.add('aw-active');
    }

    skipBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        renderAction();
    });

    // Keep widget chrome (header label, skip button, action text) in sync with
    // the active locale. `renderAction()` pulls fresh phrases from the current
    // dictionary, and the label/button strings need re-reading from `t()`.
    subscribe(() => {
        widget.setAttribute('aria-label', t('action.ofTheDay'));
        headerLabel.textContent = t('action.ofTheDay');
        skipBtn.textContent = t('action.skipButton');
        skipBtn.setAttribute('aria-label', t('action.skipButtonAria'));
        renderAction();
    });

    return { show, el: widget };
}

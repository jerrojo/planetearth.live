/**
 * Dashboard — Planet Health HUD
 *
 * Game-inspired HUD with three layers:
 *   1. Planet Health Score — aggregate hero metric (0-100) with emoji face
 *   2. Compact metric cards — emoji + value + HP bar (no text clutter)
 *   3. Hover tooltips — speech bubble + reference context on interaction
 *
 * Patterns from: Genshin Impact (minimal HUD), No Man's Sky (planet status),
 * Duolingo (progress bars), SimCity (city health score).
 *
 * Minimize chrome, maximize world, show details on demand.
 */

import type { MetricDef } from '../../types';
import { createMetrics } from '../../services/metrics';
import { formatMetricValue } from '../../utils/format';
import { HISTORICAL } from '../../data/historical';
import { getProvenance } from '../../services/provenance';
import { t, subscribe } from '../../i18n';
import type { StringKey } from '../../i18n/dictionaries';

// Mapping from metric-card index (dashboard render order) → provenance id (live API feed).
// null = derived/simulated metric with no direct live source (no staleness badge shown).
const PROVENANCE_ID_BY_INDEX: (string | null)[] = [
    'co2',              // 0: CO₂
    'globalTempAvg',    // 1: Temperature
    null,               // 2: Ocean pH (modeled)
    null,               // 3: Trees (modeled)
    null,               // 4: Clean Energy (modeled)
    null,               // 5: Emissions (modeled)
    'methane',          // 6: Methane
    'nitrous',          // 7: N₂O
    'arcticIce',        // 8: Arctic Ice
    'pm25',             // 9: PM2.5
    'carbonIntensity',  // 10: Carbon Intensity
];

/* ────────────────── Context ────────────────── */

export interface DashboardContext {
    metrics: MetricDef[];
    trendBuffers: number[][];
    trendEls: HTMLElement[];
    moodEls: HTMLElement[];
    bubbleEls: HTMLElement[];
    hpFillEls: HTMLElement[];
    hpLabelEls: HTMLElement[];
    labEls: HTMLElement[];
    cardEls: HTMLElement[];
    sparklineCanvases: HTMLCanvasElement[];
    narrativeEl: HTMLElement;
    lastValues: string[];
    planetScoreEl: HTMLElement;
    planetFaceEl: HTMLElement;
    planetBarEl: HTMLElement;
}

/** Resolve the locale-aware label for a metric (falls back to raw .label). */
function metricLabel(m: MetricDef): string {
    return m.labelKey ? t(m.labelKey as StringKey) : m.label;
}

/* ────────────────── Metric Personality ────────────────── */

// Phrases for each metric are stored as i18n keys, resolved at render time
// via `phraseFor(info, face)` so that speech bubbles + narratives follow the
// active locale. 11 metrics × 4 moods (happy / worried / danger / critical).
interface MetricPersonality {
    color: string;
    phraseKeys: Record<string, StringKey>;
}

/** Derive from metric direction — no manual sync needed */
function isPositiveGood(m: MetricDef): boolean {
    return m.direction === 'good-up' || m.direction === 'bad-down' || m.direction === 'good-down';
}

function pkeys(idx: number): Record<string, StringKey> {
    return {
        '😊': `personality.${idx}.happy`    as StringKey,
        '😟': `personality.${idx}.worried`  as StringKey,
        '😰': `personality.${idx}.danger`   as StringKey,
        '🆘': `personality.${idx}.critical` as StringKey,
    };
}

/** Resolve a translated phrase for a personality + mood face (empty string on miss). */
function phraseFor(info: MetricPersonality, face: string): string {
    const key = info.phraseKeys[face];
    return key ? t(key) : '';
}

const PERSONALITY: MetricPersonality[] = [
    { color: '#ff6b6b', phraseKeys: pkeys(0)  }, //  0 — CO₂
    { color: '#ff8c42', phraseKeys: pkeys(1)  }, //  1 — Temperature
    { color: '#4ecdc4', phraseKeys: pkeys(2)  }, //  2 — Ocean pH
    { color: '#45b7d1', phraseKeys: pkeys(3)  }, //  3 — Trees
    { color: '#96ceb4', phraseKeys: pkeys(4)  }, //  4 — Clean Energy
    { color: '#ff6b6b', phraseKeys: pkeys(5)  }, //  5 — Emissions
    { color: '#e67e22', phraseKeys: pkeys(6)  }, //  6 — Methane (CH₄)
    { color: '#9b59b6', phraseKeys: pkeys(7)  }, //  7 — Nitrous Oxide (N₂O)
    { color: '#74b9ff', phraseKeys: pkeys(8)  }, //  8 — Arctic Sea Ice
    { color: '#a29bfe', phraseKeys: pkeys(9)  }, //  9 — PM2.5 Air Quality
    { color: '#00b894', phraseKeys: pkeys(10) }, // 10 — Carbon Intensity (grid)
];

/* ────────────────── Health + Mood Calculation ────────────────── */

/**
 * Compute a 0-100 health score.
 *
 * For bad-up metrics  (CO₂, Temp, Emissions):
 *   100 at baseline, 50 at safe limit, → 0 as overshoot triples.
 * For bad-down metrics (pH, Trees):
 *   100 at baseline, 50 at safe limit, → 0 as deficit triples.
 * For good-up metrics  (Clean Energy):
 *   Ratio of current to target × 100.
 */
export function calculateHealth(m: MetricDef): number {
    if (m.direction === 'good-up') {
        const target = m.target2030 ?? 100;
        return Math.min(100, (m.value / target) * 100);
    }

    if (m.direction === 'bad-up') {
        const base = m.baseline ?? 0;
        const limit = m.safeLimit ?? m.value * 0.8;
        if (m.value <= base) return 100;
        const overshoot = (m.value - base) / (limit - base);
        return Math.max(0, Math.min(100, 100 * (1 - overshoot / 3)));
    }

    if (m.direction === 'bad-down') {
        const base = m.baseline ?? m.value * 1.2;
        const limit = m.safeLimit;
        if (!limit) {
            // No safe limit — use ratio to baseline
            return Math.min(100, (m.value / base) * 100);
        }
        if (m.value >= base) return 100;
        const overshoot = (base - m.value) / (base - limit);
        return Math.max(0, Math.min(100, 100 * (1 - overshoot / 3)));
    }

    // good-down: lower value = better (e.g., carbon intensity gCO₂/kWh)
    // 100 at target, 0 at baseline, linear progress between
    if (m.direction === 'good-down') {
        const base = m.baseline ?? m.value * 2;
        const target = m.target2030 ?? 0;
        if (m.value <= target) return 100;
        if (m.value >= base) return 0;
        return Math.min(100, ((base - m.value) / (base - target)) * 100);
    }

    return 50;
}

interface Mood {
    face: string;
    cssClass: string;
}

function getMood(health: number): Mood {
    if (health >= 75) return { face: '😊', cssClass: 'mood-good' };
    if (health >= 50) return { face: '😟', cssClass: 'mood-worried' };
    if (health >= 25) return { face: '😰', cssClass: 'mood-danger' };
    return { face: '🆘', cssClass: 'mood-critical' };
}

/**
 * Continuous HP bar color via HSL interpolation.
 * 0% → red (hue 0), 50% → yellow-amber (hue 42), 100% → green (hue 130).
 * Every percentage has its own unique color — no discrete jumps.
 */
function getHPColor(health: number): string {
    const t = Math.max(0, Math.min(100, health)) / 100;
    // Piecewise hue: 0→42 for 0-50%, 42→130 for 50-100%
    // This gives more "warning range" in the red-orange-yellow zone
    const hue = t <= 0.5
        ? t * 2 * 42          // 0 → 42 (red → amber)
        : 42 + (t - 0.5) * 2 * 88;  // 42 → 130 (amber → green)
    const sat = 70 + (1 - t) * 15;   // slightly more saturated when worse
    const lit = 55 + t * 10;         // slightly brighter when healthier
    return `hsl(${hue}, ${sat}%, ${lit}%)`;
}

/** One-liner context from the most relevant reference frame */
function getRefContext(m: MetricDef): string {
    if (m.safeLimit !== undefined && m.safeLimitLabel) {
        return `${m.safeLimitLabel}: ${formatMetricValue(m.safeLimit)}`;
    }
    if (m.target2030 !== undefined && m.target2030Label) {
        return `${m.target2030Label}: ${formatMetricValue(m.target2030)}`;
    }
    if (m.baseline !== undefined && m.baselineLabel) {
        return `${m.baselineLabel}: ${formatMetricValue(m.baseline)}`;
    }
    return '';
}

/* ────────────────── Sparkline Drawing ────────────────── */

function drawSparkline(canvas: HTMLCanvasElement, data: number[], color: string, isPositiveGood: boolean): void {
    const ctx = canvas.getContext('2d');
    if (!ctx || data.length < 2) return;

    const W = canvas.width;
    const H = canvas.height;
    const dpr = window.devicePixelRatio || 1;

    ctx.clearRect(0, 0, W, H);

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points: [number, number][] = data.map((v, i) => [
        (i / (data.length - 1)) * W,
        H - ((v - min) / range) * (H * 0.85) - H * 0.075,
    ]);

    // Gradient fill under line
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, color + '40');
    grad.addColorStop(1, color + '00');

    ctx.beginPath();
    ctx.moveTo(points[0][0], H);
    points.forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.lineTo(points[points.length - 1][0], H);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
        const [x, y] = points[i];
        const [px, py] = points[i - 1];
        const cpx = (px + x) / 2;
        ctx.bezierCurveTo(cpx, py, cpx, y, x, y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5 * dpr;
    ctx.stroke();

    // End dot
    const [lastX, lastY] = points[points.length - 1];
    ctx.beginPath();
    ctx.arc(lastX, lastY, 2 * dpr, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
}

/* ────────────────── Narrative Rotation ────────────────── */

// 8 rotating narratives — keys resolved at call time so the motto reflects
// the active locale (rotates every 12 s via Date.now-based index).
const NARRATIVE_KEYS: StringKey[] = [
    'dashboard.narrative.0',
    'dashboard.narrative.1',
    'dashboard.narrative.2',
    'dashboard.narrative.3',
    'dashboard.narrative.4',
    'dashboard.narrative.5',
    'dashboard.narrative.6',
    'dashboard.narrative.7',
];

function getCriticalNarrative(metrics: MetricDef[]): string {
    // Find the metric with worst health
    let worstHealth = 100;
    let worstIdx = 0;
    metrics.forEach((m, i) => {
        const h = calculateHealth(m);
        if (h < worstHealth) { worstHealth = h; worstIdx = i; }
    });

    const m = metrics[worstIdx];
    const info = PERSONALITY[worstIdx];
    if (worstHealth < 25) {
        return t('dashboard.critical', { metric: metricLabel(m), mood: phraseFor(info, '🆘') });
    }
    if (worstHealth < 50) {
        return t('dashboard.attention', { metric: metricLabel(m), mood: phraseFor(info, '😰') });
    }
    const key = NARRATIVE_KEYS[Math.floor(Date.now() / 12000) % NARRATIVE_KEYS.length];
    return t(key);
}

/* ────────────────── Init ────────────────── */

export function initDashboard(): DashboardContext {
    const dashEl = document.getElementById('dashboard')!;
    const metrics = createMetrics();
    const trendBuffers: number[][] = [];
    const trendEls: HTMLElement[] = [];
    const moodEls: HTMLElement[] = [];
    const bubbleEls: HTMLElement[] = [];
    const hpFillEls: HTMLElement[] = [];
    const hpLabelEls: HTMLElement[] = [];
    const labEls: HTMLElement[] = [];
    const cardEls: HTMLElement[] = [];
    const sparklineCanvases: HTMLCanvasElement[] = [];
    const lastValues: string[] = [];

    /* ═══════ Planet Health Score (hero aggregate metric) ═══════ */
    const planetWidget = document.createElement('div');
    planetWidget.className = 'planet-score';
    planetWidget.setAttribute('role', 'status');
    planetWidget.setAttribute('aria-label', t('dashboard.planetHealth.aria'));

    const planetFaceEl = document.createElement('span');
    planetFaceEl.className = 'planet-face';

    const planetScoreEl = document.createElement('span');
    planetScoreEl.className = 'planet-score-value';

    const planetLabelEl = document.createElement('span');
    planetLabelEl.className = 'planet-score-label';
    planetLabelEl.textContent = t('dashboard.planetHealth.label');

    const planetBarWrap = document.createElement('div');
    planetBarWrap.className = 'planet-bar-wrap';

    const planetBarEl = document.createElement('div');
    planetBarEl.className = 'planet-bar-fill';

    // Tooltip explaining the score
    const planetTooltip = document.createElement('div');
    planetTooltip.className = 'planet-tooltip';
    planetTooltip.textContent = t('dashboard.planetHealth.tooltip');

    // Compute initial aggregate health
    const avgHealth = metrics.reduce((sum, m) => sum + calculateHealth(m), 0) / metrics.length;
    const planetMood = getMood(avgHealth);
    planetFaceEl.textContent = planetMood.face;
    planetScoreEl.textContent = `${Math.round(avgHealth)}`;
    planetBarEl.style.width = `${avgHealth}%`;
    planetBarEl.style.background = getHPColor(avgHealth);

    // Keep the hero widget labels in sync with the active locale — all three
    // text surfaces here (aria-label, visible label, tooltip) are created once,
    // so a simple subscribe is all that's needed.
    subscribe(() => {
        planetWidget.setAttribute('aria-label', t('dashboard.planetHealth.aria'));
        planetLabelEl.textContent = t('dashboard.planetHealth.label');
        planetTooltip.textContent = t('dashboard.planetHealth.tooltip');
    });

    planetBarWrap.appendChild(planetBarEl);
    planetWidget.appendChild(planetFaceEl);
    planetWidget.appendChild(planetScoreEl);
    planetWidget.appendChild(planetLabelEl);
    planetWidget.appendChild(planetBarWrap);
    planetWidget.appendChild(planetTooltip);

    dashEl.appendChild(planetWidget);

    /* ═══════ Metric Cards ═══════ */
    const pillsContainer = document.createElement('div');
    pillsContainer.className = 'metric-pills';

    metrics.forEach((m, i) => {
        const info = PERSONALITY[i];
        const health = calculateHealth(m);
        const mood = getMood(health);

        const card = document.createElement('div');
        card.className = `metric ${mood.cssClass} animate-in`;
        card.setAttribute('role', 'status');
        card.setAttribute('aria-label', `${metricLabel(m)} — ${phraseFor(info, mood.face)}`);
        card.dataset.metricIndex = String(i);

        /* ---- Mood Face ---- */
        const faceEl = document.createElement('div');
        faceEl.className = 'mood-face';
        faceEl.textContent = mood.face;
        faceEl.setAttribute('aria-hidden', 'true');

        /* ---- Value row: number + trend arrow ---- */
        const header = document.createElement('div');
        header.className = 'metric-header';

        const valEl = document.createElement('div');
        valEl.className = 'value';
        valEl.textContent = '-';

        const trendEl = document.createElement('span');
        trendEl.className = 'trend-indicator';
        trendEl.setAttribute('aria-hidden', 'true');

        header.appendChild(valEl);
        header.appendChild(trendEl);

        /* ---- Label ---- */
        const labEl = document.createElement('div');
        labEl.className = 'label';
        labEl.textContent = metricLabel(m);

        /* ---- Sparkline Canvas ---- */
        const dpr = window.devicePixelRatio || 1;
        const sparkCanvas = document.createElement('canvas');
        sparkCanvas.className = 'sparkline-canvas';
        sparkCanvas.width = 60 * dpr;
        sparkCanvas.height = 18 * dpr;
        sparkCanvas.style.width = '60px';
        sparkCanvas.style.height = '18px';

        // Draw initial sparkline from historical data
        const histData = HISTORICAL[i];
        if (histData) {
            drawSparkline(sparkCanvas, histData, info.color, isPositiveGood(m));
        }

        /* ---- HP Bar Row (bar + percentage) ---- */
        const hpRow = document.createElement('div');
        hpRow.className = 'hp-bar-row';

        const hpWrap = document.createElement('div');
        hpWrap.className = 'hp-bar-wrap';

        const hpFill = document.createElement('div');
        hpFill.className = 'hp-bar-fill';
        hpFill.style.width = `${health}%`;
        hpFill.style.background = getHPColor(health);

        const hpLabel = document.createElement('span');
        hpLabel.className = 'hp-label';
        hpLabel.textContent = `${Math.round(health)}%`;

        hpWrap.appendChild(hpFill);
        hpRow.appendChild(hpWrap);
        hpRow.appendChild(hpLabel);

        /* ---- Hover Tooltip (speech bubble + reference — detail on demand) ---- */
        const tooltipEl = document.createElement('div');
        tooltipEl.className = 'metric-tooltip';

        const bubbleEl = document.createElement('div');
        bubbleEl.className = 'mood-bubble';
        bubbleEl.textContent = phraseFor(info, mood.face);

        const refEl = document.createElement('div');
        refEl.className = 'metric-ref';
        refEl.textContent = getRefContext(m);

        tooltipEl.appendChild(bubbleEl);
        if (getRefContext(m)) tooltipEl.appendChild(refEl);

        /* ---- Assemble card ---- */
        card.appendChild(faceEl);
        card.appendChild(header);
        card.appendChild(labEl);
        card.appendChild(sparkCanvas);
        card.appendChild(hpRow);
        card.appendChild(tooltipEl);

        pillsContainer.appendChild(card);
        m.el = valEl;

        trendBuffers.push([m.value]);
        trendEls.push(trendEl);
        moodEls.push(faceEl);
        bubbleEls.push(bubbleEl);
        hpFillEls.push(hpFill);
        hpLabelEls.push(hpLabel);
        labEls.push(labEl);
        cardEls.push(card);
        sparklineCanvases.push(sparkCanvas);
        lastValues.push('-');
    });

    // Keep metric labels + aria labels in sync with active locale.
    // (Mood bubble + narrative are refreshed every ~2 s by updateDashboardVisuals,
    //  so they don't need an explicit subscribe — their phraseFor() call pulls
    //  fresh strings from the dict.)
    subscribe(() => {
        metrics.forEach((m, i) => {
            const info = PERSONALITY[i];
            const health = calculateHealth(m);
            const mood = getMood(health);
            labEls[i].textContent = metricLabel(m);
            cardEls[i].setAttribute('aria-label', `${metricLabel(m)} — ${phraseFor(info, mood.face)}`);
        });
    });

    dashEl.appendChild(pillsContainer);

    /* ═══════ Narrative Context Bar ═══════ */
    const narrativeEl = document.createElement('div');
    narrativeEl.className = 'narrative-bar';
    narrativeEl.textContent = getCriticalNarrative(metrics);
    dashEl.appendChild(narrativeEl);

    return {
        metrics, trendBuffers, trendEls, moodEls, bubbleEls,
        hpFillEls, hpLabelEls, labEls, cardEls, sparklineCanvases,
        narrativeEl, lastValues, planetScoreEl, planetFaceEl, planetBarEl,
    };
}

/* ────────────────── Update Loop ────────────────── */

/**
 * Called every ~2 s from the animation loop.
 * Updates: trend arrows, mood face, speech bubble, HP bar, planet score.
 */
export function updateDashboardVisuals(ctx: DashboardContext): void {
    ctx.metrics.forEach((m, i) => {
        const info = PERSONALITY[i];

        // ── Trend buffer ──
        ctx.trendBuffers[i].push(m.value);
        if (ctx.trendBuffers[i].length > 30) ctx.trendBuffers[i].shift();

        // ── Trend arrow ──
        // Arrow direction is SEMANTIC: ↗ green = improving, ↘ red = worsening
        // (not literal: CO₂ going up = worsening = ↘ red)
        const buf = ctx.trendBuffers[i];
        if (buf.length >= 10) {
            const half = Math.floor(buf.length / 2);
            const recent = buf.slice(-half);
            const older = buf.slice(0, half);
            const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
            const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
            const isIncreasing = recentAvg > olderAvg;

            // Is the planet getting BETTER for this metric?
            const isImproving = isPositiveGood(m) ? isIncreasing : !isIncreasing;

            ctx.trendEls[i].textContent = isImproving ? '↗' : '↘';
            ctx.trendEls[i].className = `trend-indicator ${isImproving ? 'trend-good' : 'trend-bad'}`;
        }

        // ── Mood + HP ──
        const health = calculateHealth(m);
        const mood = getMood(health);

        // Update face
        if (ctx.moodEls[i].textContent !== mood.face) {
            ctx.moodEls[i].textContent = mood.face;
            // Quick pop animation on mood change
            ctx.moodEls[i].classList.remove('mood-pop');
            void ctx.moodEls[i].offsetWidth;
            ctx.moodEls[i].classList.add('mood-pop');
        }

        // Update bubble (in tooltip)
        const phrase = phraseFor(info, mood.face);
        if (ctx.bubbleEls[i].textContent !== phrase) {
            ctx.bubbleEls[i].textContent = phrase;
        }

        // Update HP bar + label
        ctx.hpFillEls[i].style.width = `${health}%`;
        ctx.hpFillEls[i].style.background = getHPColor(health);
        ctx.hpLabelEls[i].textContent = `${Math.round(health)}%`;

        // Update card mood class + staleness badge (derived from provenance age)
        const card = ctx.moodEls[i].closest('.metric');
        if (card) {
            card.classList.remove('mood-good', 'mood-worried', 'mood-danger', 'mood-critical');
            card.classList.add(mood.cssClass);

            // Staleness: provenance.status === 'stale' → API data older than 2× expected cadence.
            // 'offline' / 'invalid' also count — the displayed value is the last known one.
            const provId = PROVENANCE_ID_BY_INDEX[i];
            if (provId) {
                const rec = getProvenance(provId);
                const isStale = !!rec && (rec.status === 'stale' || rec.status === 'offline' || rec.status === 'invalid');
                card.classList.toggle('is-stale', isStale);
                if (isStale && rec) {
                    const ageMs = rec.fetchedAt ? Date.now() - rec.fetchedAt : null;
                    const ageStr = ageMs === null ? 'no fetch' : ageMs < 3600_000
                        ? `${Math.round(ageMs / 60_000)} min`
                        : `${Math.round(ageMs / 3600_000)} h`;
                    card.setAttribute('data-stale-age', ageStr);
                    card.setAttribute('title', `Datos con ${ageStr} de antigüedad — abre "Data Status" para detalles`);
                } else {
                    card.removeAttribute('data-stale-age');
                    card.removeAttribute('title');
                }
            }
        }

        // ── Value glow on change ──
        if (m.el) {
            const currentText = m.el.textContent || '';
            if (ctx.lastValues[i] !== currentText && ctx.lastValues[i] !== '-') {
                const flashClass = isPositiveGood(m) ? 'value-flash-good' : 'value-flash-bad';
                m.el.classList.remove('value-flash', 'value-flash-good', 'value-flash-bad');
                void m.el.offsetWidth;
                m.el.classList.add(flashClass);
                m.el.addEventListener('animationend', () => {
                    m.el!.classList.remove(flashClass);
                }, { once: true });
            }
            ctx.lastValues[i] = currentText;
        }
    });

    // ── Aggregate Planet Health Score ──
    const avgHealth = ctx.metrics.reduce((sum, m) => sum + calculateHealth(m), 0) / ctx.metrics.length;
    const planetMood = getMood(avgHealth);

    if (ctx.planetFaceEl.textContent !== planetMood.face) {
        ctx.planetFaceEl.textContent = planetMood.face;
        ctx.planetFaceEl.classList.remove('mood-pop');
        void ctx.planetFaceEl.offsetWidth;
        ctx.planetFaceEl.classList.add('mood-pop');
    }
    ctx.planetScoreEl.textContent = `${Math.round(avgHealth)}`;
    ctx.planetBarEl.style.width = `${avgHealth}%`;
    ctx.planetBarEl.style.background = getHPColor(avgHealth);

    // ── Narrative bar rotation ──
    ctx.narrativeEl.textContent = getCriticalNarrative(ctx.metrics);
}

/* ────────────────── Update Sparklines ────────────────── */

/**
 * Called less frequently (~10s) to push new data points and redraw sparklines.
 */
export function updateSparklines(ctx: DashboardContext): void {
    ctx.metrics.forEach((m, i) => {
        const canvas = ctx.sparklineCanvases[i];
        const hist = HISTORICAL[i];
        if (!canvas || !hist) return;

        const info = PERSONALITY[i];

        // Push current live value to historical buffer (max 16 points)
        hist.push(m.value);
        if (hist.length > 16) hist.shift();

        drawSparkline(canvas, hist, info.color, isPositiveGood(m));
    });
}

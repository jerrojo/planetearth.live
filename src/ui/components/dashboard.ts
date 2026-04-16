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

/* ────────────────── Context ────────────────── */

export interface DashboardContext {
    metrics: MetricDef[];
    trendBuffers: number[][];
    trendEls: HTMLElement[];
    moodEls: HTMLElement[];
    bubbleEls: HTMLElement[];
    hpFillEls: HTMLElement[];
    hpLabelEls: HTMLElement[];
    sparklineCanvases: HTMLCanvasElement[];
    narrativeEl: HTMLElement;
    lastValues: string[];
    planetScoreEl: HTMLElement;
    planetFaceEl: HTMLElement;
    planetBarEl: HTMLElement;
}

/* ────────────────── Metric Personality ────────────────── */

interface MetricPersonality {
    color: string;
    phrases: Record<string, string>;
}

/** Derive from metric direction — no manual sync needed */
function isPositiveGood(m: MetricDef): boolean {
    return m.direction === 'good-up' || m.direction === 'bad-down' || m.direction === 'good-down';
}

const PERSONALITY: MetricPersonality[] = [
    { // 0 — CO₂
        color: '#ff6b6b',
        phrases: {
            '😊': '¡Aire limpio!',
            '😟': 'El CO₂ sigue subiendo…',
            '😰': 'Me cuesta respirar…',
            '🆘': '¡No puedo respirar!',
        },
    },
    { // 1 — Temperature
        color: '#ff8c42',
        phrases: {
            '😊': '¡Temperatura estable!',
            '😟': 'Sube el calor…',
            '😰': 'Tengo fiebre…',
            '🆘': '¡Me derrito!',
        },
    },
    { // 2 — Ocean pH
        color: '#4ecdc4',
        phrases: {
            '😊': '¡Océanos sanos!',
            '😟': 'Me estoy acidificando…',
            '😰': 'Los corales sufren…',
            '🆘': '¡Mis corales mueren!',
        },
    },
    { // 3 — Trees
        color: '#45b7d1',
        phrases: {
            '😊': '¡Bosques fuertes!',
            '😟': 'Pierdo hojas…',
            '😰': 'Mis bosques caen…',
            '🆘': '¡Deforestación masiva!',
        },
    },
    { // 4 — Clean Energy
        color: '#96ceb4',
        phrases: {
            '😊': '¡Energía verde!',
            '😟': 'Falta energía limpia…',
            '😰': 'Demasiados fósiles…',
            '🆘': '¡Atrapado en carbón!',
        },
    },
    { // 5 — Emissions
        color: '#ff6b6b',
        phrases: {
            '😊': '¡Emisiones bajo control!',
            '😟': 'Emisiones subiendo…',
            '😰': 'Contamino demasiado…',
            '🆘': '¡Asfixia total!',
        },
    },
    { // 6 — Methane (CH₄)
        color: '#e67e22',
        phrases: {
            '😊': '¡Metano estable!',
            '😟': 'El metano acelera…',
            '😰': 'Demasiado metano…',
            '🆘': '¡Bomba de metano!',
        },
    },
    { // 7 — Nitrous Oxide (N₂O)
        color: '#9b59b6',
        phrases: {
            '😊': '¡N₂O bajo control!',
            '😟': 'El N₂O sube…',
            '😰': 'Exceso de fertilizantes…',
            '🆘': '¡Óxido descontrolado!',
        },
    },
    { // 8 — Arctic Sea Ice
        color: '#74b9ff',
        phrases: {
            '😊': '¡Hielo estable!',
            '😟': 'Se derrite poco a poco…',
            '😰': 'El Ártico desaparece…',
            '🆘': '¡Sin hielo!',
        },
    },
    { // 9 — PM2.5 Air Quality
        color: '#a29bfe',
        phrases: {
            '😊': '¡Aire limpio!',
            '😟': 'El aire se ensucia…',
            '😰': 'Difícil respirar…',
            '🆘': '¡Aire tóxico!',
        },
    },
    { // 10 — Carbon Intensity (UK Grid)
        color: '#00b894',
        phrases: {
            '😊': '¡Energía limpia!',
            '😟': 'Mucho carbono en la red…',
            '😰': 'Red eléctrica sucia…',
            '🆘': '¡Red 100% fósil!',
        },
    },
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

const NARRATIVES: string[] = [
    'Cada segundo cuenta. El planeta habla con datos.',
    'Los datos son la voz del planeta. ¿Escuchamos?',
    'Más conectados, más conscientes, más vivos.',
    '11 señales vitales. 10 fuentes. 1 planeta.',
    'La Tierra tiene pulso. Estás viéndolo en vivo.',
    'Cada dato es una llamada a la acción.',
    'No hay Planeta B. Hay Datos A.',
    'Observar es el primer paso para transformar.',
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
        return `⚠️ ${m.label} en estado crítico — ${info.phrases['🆘']}`;
    }
    if (worstHealth < 50) {
        return `⚡ ${m.label} necesita atención — ${info.phrases['😰']}`;
    }
    return NARRATIVES[Math.floor(Date.now() / 12000) % NARRATIVES.length];
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
    const sparklineCanvases: HTMLCanvasElement[] = [];
    const lastValues: string[] = [];

    /* ═══════ Planet Health Score (hero aggregate metric) ═══════ */
    const planetWidget = document.createElement('div');
    planetWidget.className = 'planet-score';
    planetWidget.setAttribute('role', 'status');
    planetWidget.setAttribute('aria-label', 'Salud del Planeta');

    const planetFaceEl = document.createElement('span');
    planetFaceEl.className = 'planet-face';

    const planetScoreEl = document.createElement('span');
    planetScoreEl.className = 'planet-score-value';

    const planetLabelEl = document.createElement('span');
    planetLabelEl.className = 'planet-score-label';
    planetLabelEl.textContent = 'Salud Planetaria';

    const planetBarWrap = document.createElement('div');
    planetBarWrap.className = 'planet-bar-wrap';

    const planetBarEl = document.createElement('div');
    planetBarEl.className = 'planet-bar-fill';

    // Tooltip explaining the score
    const planetTooltip = document.createElement('div');
    planetTooltip.className = 'planet-tooltip';
    planetTooltip.textContent = 'Promedio de 11 métricas ambientales en tiempo real. 100 = planeta sano, 0 = colapso.';

    // Compute initial aggregate health
    const avgHealth = metrics.reduce((sum, m) => sum + calculateHealth(m), 0) / metrics.length;
    const planetMood = getMood(avgHealth);
    planetFaceEl.textContent = planetMood.face;
    planetScoreEl.textContent = `${Math.round(avgHealth)}`;
    planetBarEl.style.width = `${avgHealth}%`;
    planetBarEl.style.background = getHPColor(avgHealth);

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
        card.setAttribute('aria-label', `${m.label} — ${info.phrases[mood.face] ?? ''}`);
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
        labEl.textContent = m.label;

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
        bubbleEl.textContent = info.phrases[mood.face] ?? '';

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
        sparklineCanvases.push(sparkCanvas);
        lastValues.push('-');
    });

    dashEl.appendChild(pillsContainer);

    /* ═══════ Narrative Context Bar ═══════ */
    const narrativeEl = document.createElement('div');
    narrativeEl.className = 'narrative-bar';
    narrativeEl.textContent = getCriticalNarrative(metrics);
    dashEl.appendChild(narrativeEl);

    return {
        metrics, trendBuffers, trendEls, moodEls, bubbleEls,
        hpFillEls, hpLabelEls, sparklineCanvases, narrativeEl, lastValues,
        planetScoreEl, planetFaceEl, planetBarEl,
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
        const phrase = info.phrases[mood.face] ?? '';
        if (ctx.bubbleEls[i].textContent !== phrase) {
            ctx.bubbleEls[i].textContent = phrase;
        }

        // Update HP bar + label
        ctx.hpFillEls[i].style.width = `${health}%`;
        ctx.hpFillEls[i].style.background = getHPColor(health);
        ctx.hpLabelEls[i].textContent = `${Math.round(health)}%`;

        // Update card mood class
        const card = ctx.moodEls[i].closest('.metric');
        if (card) {
            card.classList.remove('mood-good', 'mood-worried', 'mood-danger', 'mood-critical');
            card.classList.add(mood.cssClass);
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

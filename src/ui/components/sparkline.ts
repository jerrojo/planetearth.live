/**
 * Sparkline — tiny inline canvas charts showing metric trends over time.
 * Uses padded normalization to prevent visual instability at range boundaries.
 * Seeded with 50-year synthetic history; real-time values append to the right.
 * Rolling 120-point buffer. Triple-layer endpoint glow for premium polish.
 */
export interface SparklineContext {
    canvas: HTMLCanvasElement;
    history: number[];
    maxPoints: number;
    color: string;
    isPositiveGood: boolean;
}

export function createSparkline(
    container: HTMLElement,
    color: string,
    isPositiveGood: boolean
): SparklineContext {
    const canvas = document.createElement('canvas');
    canvas.width = 80;
    canvas.height = 24;
    canvas.className = 'sparkline-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    container.appendChild(canvas);

    return {
        canvas,
        history: [],
        maxPoints: 120, // 120 × 2s = 4 minutes of history
        color,
        isPositiveGood,
    };
}

export function pushSparklineValue(ctx: SparklineContext, value: number): void {
    ctx.history.push(value);
    if (ctx.history.length > ctx.maxPoints) {
        ctx.history.shift();
    }
}

export function renderSparkline(ctx: SparklineContext): void {
    const { canvas, history, color } = ctx;
    if (history.length < 2) return;

    const c = canvas.getContext('2d')!;
    const w = canvas.width;
    const h = canvas.height;

    c.clearRect(0, 0, w, h);

    const min = Math.min(...history);
    const max = Math.max(...history);
    const rawRange = max - min;

    // Padded normalization: add 25% margin above and below to prevent
    // the line from pinning to canvas edges and reduce visual jitter
    const padding = rawRange > 0 ? rawRange * 0.25 : Math.abs(min) * 0.001 || 1e-6;
    const paddedMin = min - padding;
    const paddedRange = rawRange + padding * 2;

    const stepX = w / (history.length - 1);

    const toY = (v: number) => h - ((v - paddedMin) / paddedRange) * (h - 4) - 2;

    // Draw filled area
    c.beginPath();
    for (let i = 0; i < history.length; i++) {
        const x = i * stepX;
        const y = toY(history[i]);
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
    }
    c.lineTo(w, h);
    c.lineTo(0, h);
    c.closePath();

    // Gradient fill
    const grad = c.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, color + '30');
    grad.addColorStop(1, color + '05');
    c.fillStyle = grad;
    c.fill();

    // Draw line on top
    c.beginPath();
    for (let i = 0; i < history.length; i++) {
        const x = i * stepX;
        const y = toY(history[i]);
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
    }
    c.strokeStyle = color;
    c.lineWidth = 1.5;
    c.stroke();

    // Dual-layer endpoint glow
    const lastX = (history.length - 1) * stepX;
    const lastY = toY(history[history.length - 1]);

    // Glow layer
    c.beginPath();
    c.arc(lastX, lastY, 4, 0, Math.PI * 2);
    c.fillStyle = color + '40';
    c.fill();

    // Solid core
    c.beginPath();
    c.arc(lastX, lastY, 2, 0, Math.PI * 2);
    c.fillStyle = color;
    c.fill();
}

/**
 * Seed a sparkline with synthetic 50-year historical trend.
 * Generates `maxPoints` data points from (value - rate*years*sec/yr) → value.
 * Adds Keeling-style seasonal oscillation for CO₂ (amplitudeSeasonal param).
 * The rightmost point = current live value; real-time ticks continue appending.
 */
export function seedSparklineHistory(
    ctx: SparklineContext,
    currentValue: number,
    ratePerSecond: number,
    years: number = 50,
    amplitudeSeasonal: number = 0,
): void {
    const secPerYear = 31_557_600;
    const totalSeconds = years * secPerYear;
    const points = ctx.maxPoints;

    ctx.history = [];
    for (let i = 0; i < points; i++) {
        const t = (i / (points - 1)) * totalSeconds; // 0 → totalSeconds
        const elapsed = totalSeconds - t;             // seconds ago from now
        let v = currentValue - ratePerSecond * elapsed;

        // Add seasonal oscillation (e.g., Keeling curve ~6 ppm peak-to-trough)
        if (amplitudeSeasonal > 0) {
            const yearFrac = (t / secPerYear) % 1;
            v += amplitudeSeasonal * Math.cos(2 * Math.PI * (yearFrac - 135 / 365.25));
        }
        ctx.history.push(v);
    }
}

/**
 * Get trend indicator based on recent values.
 * Uses 30-point window (~1 minute) for stable trend detection.
 */
export function getTrendIndicator(history: number[], isPositiveGood: boolean): {
    arrow: string;
    cssClass: string;
    label: string;
} {
    if (history.length < 20) return { arrow: '', cssClass: 'neutral', label: 'Calculando...' };

    const windowSize = Math.min(30, history.length);
    const half = Math.floor(windowSize / 2);
    const recent = history.slice(-half);
    const older = history.slice(-windowSize, -half);

    if (older.length === 0) return { arrow: '', cssClass: 'neutral', label: '' };

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

    const isIncreasing = recentAvg > olderAvg;

    if (isPositiveGood) {
        if (isIncreasing) return { arrow: '\u2197', cssClass: 'trend-good', label: 'Mejorando' };
        return { arrow: '\u2198', cssClass: 'trend-bad', label: 'Empeorando' };
    } else {
        if (isIncreasing) return { arrow: '\u2197', cssClass: 'trend-bad', label: 'Empeorando' };
        return { arrow: '\u2198', cssClass: 'trend-good', label: 'Mejorando' };
    }
}

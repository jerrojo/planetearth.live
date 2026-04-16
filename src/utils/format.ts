/**
 * Format a population count with locale-aware thousands separators.
 * Locale defaults to the current document language (falls back to 'es-MX').
 */
export function formatPop(n: number, locale?: string): string {
    const lang = locale
        ?? (typeof document !== 'undefined' ? document.documentElement.lang : undefined)
        ?? 'es-MX';
    return n.toLocaleString(lang || 'es-MX');
}

/**
 * Abbreviate a large metric value using SI-style suffixes.
 * T = trillion (1e12), B = billion (1e9), M = million (1e6).
 */
export function formatMetricValue(value: number): string {
    if (value > 1e12) return (value / 1e12).toFixed(3) + 'T';
    if (value > 1e9) return (value / 1e9).toFixed(2) + 'B';
    if (value > 1e6) return (value / 1e6).toFixed(1) + 'M';
    if (value > 100) return value.toFixed(value > 1000 ? 0 : 1);
    return value.toFixed(2);
}

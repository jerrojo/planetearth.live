export function formatPop(n: number): string {
    return n.toLocaleString('es-MX');
}

export function formatMetricValue(value: number): string {
    if (value > 1e12) return (value / 1e12).toFixed(3) + 'T';
    if (value > 1e9) return (value / 1e9).toFixed(2) + 'B';
    if (value > 1e6) return (value / 1e6).toFixed(1) + 'M';
    if (value > 100) return value.toFixed(value > 1000 ? 0 : 1);
    return value.toFixed(2);
}

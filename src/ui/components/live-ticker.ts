/**
 * Live Impact Ticker — "Desde que llegaste" / "Since you arrived"
 *
 * Real-time counter showing environmental damage accumulating
 * since the user opened the page. Creates visceral urgency.
 *
 * Known annual rates (divided by seconds/year = 31,557,600):
 *   CO₂:  40.6 GT/yr = 1,287 tonnes/sec
 *   Trees: 10B/yr     = 317 trees/sec
 *   Ice:   0.6M km²/decade = 1.9 km²/hr lost
 *
 * All user-visible labels and units are resolved via i18n at call time
 * so the ticker respects the active locale.
 */
import { t, subscribe } from '../../i18n';
import type { StringKey } from '../../i18n/dictionaries';

export interface TickerContext {
    el: HTMLElement;
    startTime: number;
    rafId: number;
}

interface TickerItem {
    icon: string;
    rate: number;        // per second
    unitKey: StringKey;
    format: (n: number) => string;
    isLoss: boolean;     // true = bad accumulation, false = good
}

const ITEMS: TickerItem[] = [
    {
        icon: '💨',
        rate: 1287,                  // tonnes CO₂ per second
        unitKey: 'ticker.unitCO2',
        format: (n) => n < 1000 ? n.toFixed(0) : `${(n / 1000).toFixed(1)}K`,
        isLoss: true,
    },
    {
        icon: '🌳',
        rate: 317,                   // trees lost per second
        unitKey: 'ticker.unitTrees',
        format: (n) => n < 1000 ? n.toFixed(0) : `${(n / 1000).toFixed(1)}K`,
        isLoss: true,
    },
    {
        icon: '🧊',
        rate: 0.000528,             // km² ice lost per second (1.9 km²/hr)
        unitKey: 'ticker.unitIce',
        format: (n) => n.toFixed(2),
        isLoss: true,
    },
];

export function initLiveTicker(parentEl: HTMLElement): TickerContext {
    const el = document.createElement('div');
    el.className = 'live-ticker';
    el.setAttribute('aria-live', 'off');  // don't spam screen readers

    const label = document.createElement('span');
    label.className = 'ticker-label';
    label.textContent = t('ticker.sinceYouArrived');
    // Transparency: these are *global* annual rates extrapolated to per-second,
    // not per-user or per-region live telemetry. Tooltip is discoverable via hover.
    label.title = t('ticker.provenance');

    const counters = document.createElement('div');
    counters.className = 'ticker-counters';

    // Retain unit spans per item so we can swap their text on locale change
    // without tearing down and re-creating the whole ticker.
    const unitEls: HTMLElement[] = [];

    ITEMS.forEach((item, i) => {
        const counter = document.createElement('span');
        counter.className = `ticker-item ${item.isLoss ? 'ticker-loss' : 'ticker-gain'}`;
        counter.dataset.idx = String(i);

        const iconEl = document.createElement('span');
        iconEl.className = 'ticker-icon';
        iconEl.textContent = item.icon;

        const valEl = document.createElement('span');
        valEl.className = 'ticker-val';
        valEl.dataset.counter = String(i);
        valEl.textContent = '0';

        const unitEl = document.createElement('span');
        unitEl.className = 'ticker-unit';
        unitEl.textContent = t(item.unitKey);
        unitEls.push(unitEl);

        counter.appendChild(iconEl);
        counter.appendChild(valEl);
        counter.appendChild(document.createTextNode(' '));
        counter.appendChild(unitEl);
        counters.appendChild(counter);
    });

    el.appendChild(label);
    el.appendChild(counters);

    // Re-read translatable strings on locale change — label, tooltip, and
    // per-item units. Numeric values continue ticking via the RAF loop.
    subscribe(() => {
        label.textContent = t('ticker.sinceYouArrived');
        label.title = t('ticker.provenance');
        ITEMS.forEach((item, i) => {
            unitEls[i].textContent = t(item.unitKey);
        });
    });

    // Insert after the metric pills (data legend below stats)
    const pillsEl = parentEl.querySelector('.metric-pills');
    if (pillsEl?.nextSibling) {
        parentEl.insertBefore(el, pillsEl.nextSibling);
    } else {
        parentEl.appendChild(el);
    }

    const startTime = performance.now();
    const valEls = el.querySelectorAll('.ticker-val');

    let rafId = 0;
    function tick(): void {
        const elapsed = (performance.now() - startTime) / 1000; // seconds

        ITEMS.forEach((item, i) => {
            const accumulated = item.rate * elapsed;
            const valEl = valEls[i];
            if (valEl) {
                valEl.textContent = `+${item.format(accumulated)}`;
            }
        });

        rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);

    return { el, startTime, rafId };
}

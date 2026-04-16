/**
 * Live Impact Ticker — "Desde que llegaste"
 *
 * Real-time counter showing environmental damage accumulating
 * since the user opened the page. Creates visceral urgency.
 *
 * Known annual rates (divided by seconds/year = 31,557,600):
 *   CO₂:  40.6 GT/yr = 1,287 tonnes/sec
 *   Trees: 10B/yr     = 317 trees/sec
 *   Ice:   0.6M km²/decade = 1.9 km²/hr lost
 */

export interface TickerContext {
    el: HTMLElement;
    startTime: number;
    rafId: number;
}

interface TickerItem {
    icon: string;
    rate: number;        // per second
    unit: string;
    format: (n: number) => string;
    isLoss: boolean;     // true = bad accumulation, false = good
}

const ITEMS: TickerItem[] = [
    {
        icon: '💨',
        rate: 1287,                  // tonnes CO₂ per second
        unit: 'ton CO₂',
        format: (n) => n < 1000 ? n.toFixed(0) : `${(n / 1000).toFixed(1)}K`,
        isLoss: true,
    },
    {
        icon: '🌳',
        rate: 317,                   // trees lost per second
        unit: 'árboles',
        format: (n) => n < 1000 ? n.toFixed(0) : `${(n / 1000).toFixed(1)}K`,
        isLoss: true,
    },
    {
        icon: '🧊',
        rate: 0.000528,             // km² ice lost per second (1.9 km²/hr)
        unit: 'km² hielo',
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
    label.textContent = 'Desde que llegaste';

    const counters = document.createElement('div');
    counters.className = 'ticker-counters';

    ITEMS.forEach((item, i) => {
        const counter = document.createElement('span');
        counter.className = `ticker-item ${item.isLoss ? 'ticker-loss' : 'ticker-gain'}`;
        counter.dataset.idx = String(i);
        counter.innerHTML = `<span class="ticker-icon">${item.icon}</span><span class="ticker-val" data-counter="${i}">0</span> <span class="ticker-unit">${item.unit}</span>`;
        counters.appendChild(counter);
    });

    el.appendChild(label);
    el.appendChild(counters);

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


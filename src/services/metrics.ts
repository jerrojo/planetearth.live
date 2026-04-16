import type { MetricDef } from '../types';
import { formatMetricValue } from '../utils/format';

// === Keeling Curve CO₂ Seasonality ===
// Mauna Loa record shows ~6 ppm peak-to-trough annual oscillation
// driven by Northern Hemisphere biosphere photosynthesis/respiration.
// Peak ~May (day 135), trough ~October. Amplitude ±3 ppm.
// Source: NOAA GML, Keeling et al. (2005)
function keelingSeasonalOffset(): number {
    const now = new Date();
    const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const dayOfYear = (now.getTime() - startOfYear.getTime()) / 86400000;
    return 3.0 * Math.cos((2 * Math.PI * (dayOfYear - 135)) / 365.25);
}

// === Scientifically-grounded metric definitions ===
// All rates are per second, derived from annual rates / 31,557,600 (tropical year)
//
// Sources & citations:
//   CO₂:         NOAA GML Mauna Loa, annual mean 2025: ~429 ppm, +2.5 ppm/yr
//   Temperature:  NASA GISS v4, global mean anomaly: +1.45°C (2025), trend +0.027°C/yr (2015-2025)
//   Ocean pH:     Bates et al. (2014) BATS time-series: 8.07, −0.0017 units/yr
//   Trees:        Crowther et al. (2015) total: 3.04T; FAO FRA 2020 net loss: ~10B/yr
//   Clean Energy: IEA World Energy Outlook 2025: 33% renewables share, +1.8 pp/yr
//   Emissions:    Global Carbon Budget 2025: 40.6 GT CO₂ (fossil+cement), +0.5 GT/yr
//   Methane:      NOAA ESRL, global mean 2025: ~1946 ppb, +10 ppb/yr (2020-2025 mean; accelerating)
//   N₂O:          NOAA ESRL, global mean Nov 2025: ~339 ppb, +1.0 ppb/yr
//   Arctic Ice:   NSIDC, global sea ice extent: ~17 M km², −0.6 M km²/decade

export function createMetrics(): MetricDef[] {
    const co2Seasonal = keelingSeasonalOffset();

    return [
        // ── INDEX 0: CO₂ ──
        {
            label: 'CO₂ (PPM)',
            value: 429.0 + co2Seasonal,
            rate: 7.92e-8,              // +2.5 ppm/yr (NOAA Mauna Loa)
            source: 'NOAA Mauna Loa',
            uncertainty: '±0.4 ppm',
            baseline: 280,
            baselineLabel: 'Pre-industrial (1750)',
            safeLimit: 350,
            safeLimitLabel: 'Límite seguro (Hansen 2008)',
            humanRate: '+2.5 ppm/año',
            direction: 'bad-up',
        },
        // ── INDEX 1: TEMPERATURE ──
        {
            label: 'TEMP +°C',
            value: 1.45,
            rate: 8.55e-10,             // +0.027°C/yr (NASA GISS 2015-2025 trend)
            source: 'NASA GISS v4',
            uncertainty: '±0.08°C',
            baseline: 0,
            baselineLabel: 'Media 1850-1900',
            safeLimit: 1.5,
            safeLimitLabel: 'Acuerdo de París',
            humanRate: '+0.027°C/año',
            direction: 'bad-up',
        },
        // ── INDEX 2: OCEAN PH ──
        {
            label: 'PH OCEÁNICO',
            value: 8.07,
            rate: -5.39e-11,            // −0.0017 pH/yr (Bates et al. BATS)
            source: 'Bates et al. 2014',
            uncertainty: '±0.01',
            baseline: 8.18,
            baselineLabel: 'Pre-industrial',
            safeLimit: 8.10,
            safeLimitLabel: 'Límite superior estrés coralino (8.10-7.95)',
            humanRate: '−0.0017/año',
            direction: 'bad-down',
        },
        // ── INDEX 3: TREES ──
        {
            label: 'ÁRBOLES',
            value: 3_040_000_000_000,
            rate: -317,                 // −10B/yr net loss (FAO FRA 2020)
            source: 'FAO FRA 2020',
            uncertainty: '±30%',
            baseline: 6_000_000_000_000,
            baselineLabel: 'Hace 10,000 años',
            humanRate: '−317 árboles/seg',
            direction: 'bad-down',
        },
        // ── INDEX 4: CLEAN ENERGY ──
        {
            label: 'ENERGÍA LIMPIA %',
            value: 33.0,
            rate: 5.70e-8,             // +1.8 pp/yr (IEA trajectory)
            source: 'IEA WEO 2025',
            uncertainty: '±2 pp',
            baseline: 0,
            baselineLabel: 'Era pre-renovable',
            target2030: 50,
            target2030Label: 'Meta IEA 2030',
            humanRate: '+1.8 pp/año',
            direction: 'good-up',
        },
        // ── INDEX 5: EMISSIONS ──
        {
            label: 'EMISIONES GT CO₂',
            value: 40.6,
            rate: 1.58e-8,             // +0.5 GT/yr acceleration (GCB 2025)
            source: 'Global Carbon Budget',
            uncertainty: '±5%',
            baseline: 0,
            baselineLabel: 'Pre-industrial',
            safeLimit: 20,
            safeLimitLabel: 'Meta net-zero (IPCC)',
            humanRate: '+0.5 GT/año',
            direction: 'bad-up',
        },
        // ── INDEX 6: METHANE (CH₄) ── NEW — Live via global-warming.org
        // 2nd most potent greenhouse gas. GWP-100 = 28× CO₂.
        // Pre-industrial: ~722 ppb. Current: ~1946 ppb.
        // Rapid rise since 2020 due to wetlands + fossil fuel leaks.
        // Planetary boundary: CH₄ is subsumed under the climate change boundary
        // (radiative forcing ΔF < +1.0 W/m²). ~1150 ppb approximates the CH₄
        // concentration consistent with staying within the safe operating space.
        // Source: Steffen et al. (2015) Science 347:1259855, NOAA ESRL
        {
            label: 'METANO PPB',
            value: 1946,
            rate: 3.17e-7,             // +10 ppb/yr (NOAA ESRL 2020-2025 mean; note: accelerating from ~8 ppb/yr pre-2020)
            source: 'NOAA ESRL',
            uncertainty: '±1.1 ppb',
            baseline: 722,
            baselineLabel: 'Pre-industrial (1750)',
            safeLimit: 1150,
            safeLimitLabel: 'Zona segura (Steffen 2015 ~ΔF)',
            humanRate: '+10 ppb/año',
            direction: 'bad-up',
        },
        // ── INDEX 7: NITROUS OXIDE (N₂O) ── NEW — Live via global-warming.org
        // 3rd most potent GHG. GWP-100 = 265× CO₂. Lifetime ~121 years.
        // Main sources: agriculture (fertilizers), industry, biomass burning.
        // Pre-industrial: ~270 ppb. Current: ~339 ppb. ALREADY PAST BOUNDARY.
        // Planetary boundary: 290 ppb (Steffen et al. 2015, Science 347:1259855)
        // Source: NOAA Global Monitoring Laboratory
        {
            label: 'N₂O PPB',
            value: 339,
            rate: 3.17e-8,             // +1.0 ppb/yr mid-range (NOAA ESRL; recent 2019-2025 acceleration ~1.2 ppb/yr)
            source: 'NOAA GML',
            uncertainty: '±0.14 ppb',
            baseline: 270,
            baselineLabel: 'Pre-industrial (1750)',
            safeLimit: 290,
            safeLimitLabel: 'Planetary Boundary (Steffen 2015)',
            humanRate: '+1.0 ppb/año',
            direction: 'bad-up',
        },
        // ── INDEX 8: ARCTIC SEA ICE ── NEW — Live via global-warming.org (NSIDC data)
        // Sentinel of climate change. Reflects solar radiation (albedo feedback).
        // 1991-2020 baseline mean: ~22.76 M km².
        // Losing ~0.6 M km²/decade (NSIDC decadal trend).
        // Source: NSIDC Sea Ice Index v3.0
        {
            label: 'HIELO ÁRTICO M km²',
            value: 17.0,
            rate: -1.90e-6,            // −0.06 M km²/yr = −0.6/decade (NSIDC trend)
            source: 'NSIDC v3.0',
            uncertainty: '±0.5 M km²',
            baseline: 22.76,
            baselineLabel: 'Media anual 1991-2020',
            safeLimit: 19.0,
            safeLimitLabel: 'Media 1979-2000 (era pre-aceleración)',
            humanRate: '−0.06 M km²/año',
            direction: 'bad-down',
        },
        // ── INDEX 9: PM2.5 AIR QUALITY ── Live via Open-Meteo (CAMS/Copernicus)
        // The invisible killer. Air pollution causes 7 million premature deaths/year (WHO).
        // Global urban PM2.5 average: ~35 μg/m³ (WHO State of Global Air 2024).
        // WHO 2021 guideline: annual mean < 15 μg/m³; interim target: < 35 μg/m³.
        // Value: 3-city average (NYC, Delhi, London) as global urban proxy.
        // Rate: 0 — this is a real-time snapshot, not a trend (overwritten by API each refresh).
        // Source: Copernicus Atmosphere Monitoring Service (CAMS) via Open-Meteo
        {
            label: 'PM2.5 μg/m³',
            value: 35.0,
            rate: 0,                   // snapshot metric — overwritten by live API data
            source: 'CAMS / Open-Meteo',
            uncertainty: '±10 μg/m³',
            baseline: 0,
            baselineLabel: 'Aire limpio',
            safeLimit: 15,
            safeLimitLabel: 'Guía OMS 2021',
            humanRate: '7M muertes/año (OMS)',
            direction: 'bad-up',
        },
        // ── INDEX 10: CARBON INTENSITY ── Live via UK National Grid ESO
        // How dirty is the electricity grid RIGHT NOW? gCO₂ per kWh generated.
        // UK grid: from ~500 gCO₂/kWh (2010) → ~115 (2025) — fastest G7 decarbonization.
        // Varies 50-300+ through the day depending on wind/solar/gas mix.
        // Target: <50 gCO₂/kWh by 2035 (UK net-zero electricity).
        // Source: University of Oxford + National Grid ESO (carbonintensity.org.uk)
        {
            label: 'CARBONO g/kWh',
            value: 115,
            rate: 0,                   // snapshot metric — overwritten by live API data
            source: 'National Grid ESO',
            uncertainty: '±5 g',
            baseline: 500,
            baselineLabel: 'Red UK 2010',
            target2030: 50,
            target2030Label: 'Meta UK 2035',
            humanRate: '−25 g/kWh por año',
            direction: 'good-down',
        },
    ];
}

// Smoothly animated display values for tween effect
const displayValues = new Map<HTMLElement, number>();

export function updateMetrics(metrics: MetricDef[], dt: number): void {
    for (const m of metrics) {
        m.value += m.rate * dt;
        if (m.el) {
            if (!displayValues.has(m.el)) {
                displayValues.set(m.el, m.value);
            }
            const currentDisplay = displayValues.get(m.el)!;
            const newDisplay = currentDisplay + (m.value - currentDisplay) * 0.12;
            displayValues.set(m.el, newDisplay);

            const formatted = formatMetricValue(newDisplay);
            if (m.el.textContent !== formatted) {
                m.el.textContent = formatted;
            }
        }
    }
}

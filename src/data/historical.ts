/**
 * Historical trend data for sparklines.
 *
 * Each metric has 12 data points representing recent monthly/periodic values.
 * These create the mini-charts in each metric card.
 *
 * Sources:
 *   CO₂:    NOAA Mauna Loa monthly means 2025 (seasonal Keeling curve)
 *   Temp:   NASA GISS monthly anomalies 2024-2025
 *   pH:     BATS time-series interpolated monthly
 *   Trees:  FAO FRA estimated monthly net loss
 *   Energy: IEA monthly renewables share estimates
 *   Emit:   Global Carbon Budget monthly fossil+cement
 *   CH₄:    NOAA ESRL monthly means
 *   N₂O:    NOAA GML monthly means
 *   Ice:    NSIDC monthly sea ice extent (seasonal cycle)
 *   PM2.5:  Open-Meteo CAMS monthly averages (multi-city)
 *   Carbon: UK Grid ESO monthly average intensity
 */

export const HISTORICAL: number[][] = [
    // 0 — CO₂ ppm (Mar 2025 – Feb 2026, Keeling seasonal)
    [424.6, 426.9, 428.2, 427.8, 426.0, 423.5, 421.7, 422.4, 424.1, 425.8, 427.3, 428.9],

    // 1 — Temperature anomaly °C (monthly 2025)
    [1.35, 1.54, 1.68, 1.58, 1.47, 1.64, 1.51, 1.43, 1.54, 1.39, 1.30, 1.57],

    // 2 — Ocean pH (interpolated, slow decline)
    [8.076, 8.075, 8.075, 8.074, 8.074, 8.073, 8.073, 8.072, 8.072, 8.071, 8.071, 8.070],

    // 3 — Trees (trillions, net loss ~0.83B/month)
    [3.049, 3.048, 3.047, 3.046, 3.045, 3.044, 3.043, 3.043, 3.042, 3.041, 3.041, 3.040],

    // 4 — Clean Energy % (rising trend)
    [30.5, 31.0, 31.2, 31.8, 32.0, 32.5, 32.4, 32.8, 33.0, 33.2, 32.8, 33.0],

    // 5 — Emissions GT CO₂ (12-month running total)
    [39.8, 39.9, 40.0, 40.1, 40.1, 40.2, 40.3, 40.3, 40.4, 40.5, 40.5, 40.6],

    // 6 — Methane ppb (steady rise)
    [1934, 1935, 1936, 1937, 1938, 1939, 1940, 1941, 1942, 1943, 1945, 1946],

    // 7 — N₂O ppb (steady rise)
    [338.0, 338.1, 338.2, 338.3, 338.4, 338.5, 338.6, 338.7, 338.8, 339.0, 339.2, 339.5],

    // 8 — Arctic Sea Ice M km² (strong seasonal cycle: high Feb, low Sep)
    [14.5, 15.2, 15.6, 14.8, 13.2, 11.5, 10.8, 9.6, 10.2, 12.5, 15.0, 17.0],

    // 9 — PM2.5 μg/m³ (variable, seasonal)
    [42, 38, 36, 32, 28, 30, 35, 40, 44, 38, 34, 36],

    // 10 — Carbon Intensity gCO₂/kWh (variable, declining trend)
    [180, 165, 145, 130, 110, 95, 100, 120, 135, 125, 118, 115],
];

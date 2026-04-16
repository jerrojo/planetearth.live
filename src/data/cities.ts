/**
 * Major world cities with population (millions) and CO₂ per capita (tonnes/year).
 * Sources:
 *   Population: UN World Urbanization Prospects 2024 revision
 *   CO₂ per capita: Global Carbon Project 2024 national averages, adjusted for
 *   urban/national ratio where city-level data available (C40 Cities reports).
 *
 * CO₂ per capita notes:
 *   - US national avg ~14.0 t/cap (2024), cities ~10-12 (transit/density effect)
 *   - China national avg ~8.9 t/cap (2024), tier-1 cities ~10-11
 *   - India national avg ~2.0 t/cap (2024), Delhi ~1.8 (transport-heavy)
 *   - UAE national avg ~21.8 t/cap (2024), Dubai ~24 (AC/desalination)
 */
export interface CityData {
    lat: number;
    lon: number;
    popM: number;    // population in millions (metro area)
    co2pc: number;   // CO₂ per capita (tonnes/year, 2024 estimate)
}

export const cities: CityData[] = [
    { lat: 40.7,  lon: -74,    popM: 18.8, co2pc: 11.0 },  // New York (C40: transit reduces per-cap)
    { lat: 51.5,  lon: -0.1,   popM: 9.5,  co2pc: 4.5 },   // London (UK grid decarbonization)
    { lat: 35.7,  lon: 139.7,  popM: 37.4, co2pc: 8.0 },   // Tokyo (Japan national ~8.0)
    { lat: -23.5, lon: -46.6,  popM: 22.0, co2pc: 2.0 },   // São Paulo (Brazil hydro grid)
    { lat: 28.6,  lon: 77.2,   popM: 32.9, co2pc: 1.8 },   // Delhi (India nat'l ~2.0, city slightly below)
    { lat: -33.9, lon: 18.4,   popM: 4.9,  co2pc: 7.0 },   // Cape Town (SA coal-dependent grid)
    { lat: 55.7,  lon: 37.6,   popM: 12.6, co2pc: 11.5 },  // Moscow (Russia nat'l ~12.1)
    { lat: 31.2,  lon: 121.5,  popM: 28.5, co2pc: 10.5 },  // Shanghai (tier-1 city, above nat'l avg)
    { lat: 19.4,  lon: -99.1,  popM: 21.8, co2pc: 3.4 },   // Mexico City (Mexico nat'l ~3.6)
    { lat: -33.4, lon: -70.6,  popM: 6.8,  co2pc: 4.5 },   // Santiago (Chile nat'l ~4.7)
    { lat: 1.3,   lon: 103.8,  popM: 6.0,  co2pc: 8.0 },   // Singapore (city-state, nat'l = city)
    { lat: 37.8,  lon: -122.4, popM: 3.3,  co2pc: 10.0 },  // San Francisco (CA cleaner grid)
    { lat: 48.9,  lon: 2.3,    popM: 11.2, co2pc: 4.0 },   // Paris (France nuclear grid)
    { lat: -1.3,  lon: 36.8,   popM: 5.3,  co2pc: 0.4 },   // Nairobi (Kenya ~0.4, geothermal grid)
    { lat: 59.3,  lon: 18.1,   popM: 1.6,  co2pc: 3.5 },   // Stockholm (Sweden nat'l ~3.6)
    { lat: -37.8, lon: 144.9,  popM: 5.2,  co2pc: 14.0 },  // Melbourne (Australia nat'l ~15.0)
    { lat: 30.0,  lon: 31.2,   popM: 21.3, co2pc: 2.5 },   // Cairo (Egypt nat'l ~2.6)
    { lat: 6.5,   lon: 3.4,    popM: 15.4, co2pc: 0.6 },   // Lagos (Nigeria nat'l ~0.6)
    { lat: 23.8,  lon: 90.4,   popM: 22.5, co2pc: 0.6 },   // Dhaka (Bangladesh nat'l ~0.6)
    { lat: 39.9,  lon: 116.4,  popM: 21.5, co2pc: 10.5 },  // Beijing (tier-1 city, heavy heating)
    { lat: 25.2,  lon: 55.3,   popM: 3.5,  co2pc: 24.0 },  // Dubai (UAE nat'l ~21.8, city AC/desal)
    { lat: 34.0,  lon: -118.2, popM: 12.5, co2pc: 11.5 },  // Los Angeles (car-dependent)
    { lat: 13.8,  lon: 100.5,  popM: 10.7, co2pc: 3.5 },   // Bangkok (Thailand nat'l ~3.8)
    { lat: -6.2,  lon: 106.8,  popM: 11.0, co2pc: 2.3 },   // Jakarta (Indonesia nat'l ~2.3)
];

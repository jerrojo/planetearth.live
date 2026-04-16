/**
 * Conservation International's 36 Biodiversity Hotspots
 * Plus major UNESCO Natural Heritage Sites and Protected Areas.
 *
 * Each hotspot holds at least 1,500 endemic plant species
 * and has lost ≥70% of its original habitat.
 *
 * Source: Myers et al. (2000), Conservation International (2024)
 * Coordinates: approximate centroid [lat, lon, name, type]
 */

export interface BioHotspot {
    lat: number;
    lon: number;
    name: string;
    type: 'hotspot' | 'park' | 'marine';
}

export const biodiversityHotspots: BioHotspot[] = [
    // ── Conservation International Biodiversity Hotspots ──
    { lat: 10, lon: -84, name: 'Mesoamérica', type: 'hotspot' },
    { lat: 4, lon: -76, name: 'Tumbes-Chocó-Magdalena', type: 'hotspot' },
    { lat: -15, lon: -48, name: 'Cerrado', type: 'hotspot' },
    { lat: -22, lon: -43, name: 'Mata Atlántica', type: 'hotspot' },
    { lat: -13, lon: -69, name: 'Andes Tropicales', type: 'hotspot' },
    { lat: 18, lon: -72, name: 'Islas del Caribe', type: 'hotspot' },
    { lat: 37, lon: -5, name: 'Cuenca Mediterránea', type: 'hotspot' },
    { lat: 43, lon: 42, name: 'Cáucaso', type: 'hotspot' },
    { lat: 3, lon: 10, name: 'Bosques Guinea Occidental', type: 'hotspot' },
    { lat: 5, lon: 38, name: 'Cuerno de África', type: 'hotspot' },
    { lat: -19, lon: 47, name: 'Madagascar', type: 'hotspot' },
    { lat: -30, lon: 19, name: 'Fynbos del Cabo', type: 'hotspot' },
    { lat: -12, lon: 35, name: 'Bosques Costeros Este África', type: 'hotspot' },
    { lat: -15, lon: 28, name: 'Maputaland-Pondoland', type: 'hotspot' },
    { lat: 8, lon: 77, name: 'Ghats Occidentales', type: 'hotspot' },
    { lat: 28, lon: 85, name: 'Himalaya', type: 'hotspot' },
    { lat: 22, lon: 100, name: 'Indo-Burma', type: 'hotspot' },
    { lat: 7, lon: 80, name: 'Sri Lanka', type: 'hotspot' },
    { lat: -2, lon: 110, name: 'Sundaland', type: 'hotspot' },
    { lat: 11, lon: 122, name: 'Filipinas', type: 'hotspot' },
    { lat: 1, lon: 120, name: 'Wallacea', type: 'hotspot' },
    { lat: 25, lon: 108, name: 'Montañas Suroeste China', type: 'hotspot' },
    { lat: 35, lon: 136, name: 'Japón', type: 'hotspot' },
    { lat: -6, lon: 147, name: 'Melanesia Oriental', type: 'hotspot' },
    { lat: -18, lon: 168, name: 'Nueva Caledonia', type: 'hotspot' },
    { lat: -40, lon: 172, name: 'Nueva Zelanda', type: 'hotspot' },
    { lat: -25, lon: 130, name: 'Suroeste Australia', type: 'hotspot' },
    { lat: -8, lon: 141, name: 'Bosques Queensland', type: 'hotspot' },
    { lat: 36, lon: -120, name: 'Provincia Florística California', type: 'hotspot' },  // Central CA coast
    { lat: -40, lon: -73, name: 'Bosques Templados Chile', type: 'hotspot' },
    { lat: 38, lon: 42, name: 'Irano-Anatoliana', type: 'hotspot' },  // Anatolia + Zagros Mts centroid
    { lat: 38, lon: 70, name: 'Montañas Asia Central', type: 'hotspot' },  // Pamir/Tian Shan centroid

    // ── Iconic National Parks & Protected Areas ──
    { lat: -3.1, lon: 37.3, name: 'Kilimanjaro NP', type: 'park' },
    { lat: -2.3, lon: 34.8, name: 'Serengeti NP', type: 'park' },
    { lat: -1.5, lon: 29.5, name: 'Virunga NP (Gorilas)', type: 'park' },
    { lat: 0.5, lon: 37.5, name: 'Monte Kenya NP', type: 'park' },
    { lat: -13.2, lon: -72.5, name: 'Machu Picchu', type: 'park' },
    { lat: -0.5, lon: -90, name: 'Galápagos', type: 'park' },
    { lat: 44.5, lon: -110.5, name: 'Yellowstone NP', type: 'park' },
    { lat: 36.1, lon: -112, name: 'Gran Cañón NP', type: 'park' },
    { lat: -3, lon: -60, name: 'Amazonia Central', type: 'park' },
    { lat: -25.3, lon: -54, name: 'Iguazú', type: 'park' },
    { lat: 27.2, lon: 88.1, name: 'Kangchenjunga', type: 'park' },
    { lat: 27.9, lon: 86.9, name: 'Sagarmatha (Everest)', type: 'park' },
    { lat: 47.5, lon: -121.7, name: 'Olympic NP', type: 'park' },

    // ── Marine Protected Areas ──
    { lat: -18.3, lon: 147.7, name: 'Gran Barrera de Coral', type: 'marine' },
    { lat: -10.5, lon: -109.3, name: 'Galápagos Marine', type: 'marine' },
    { lat: 5.3, lon: -87, name: 'Cocos Marine', type: 'marine' },
    { lat: 25.5, lon: -171, name: 'Papahānaumokuākea', type: 'marine' },  // NW Hawaiian Islands MPA centroid
    { lat: -7.4, lon: -14.3, name: 'Ascensión Marine', type: 'marine' },
    { lat: -52, lon: -59.5, name: 'Islas Malvinas Marine', type: 'marine' },
    { lat: -54.5, lon: 158.9, name: 'Macquarie Marine', type: 'marine' },
    { lat: 12.2, lon: 43.2, name: 'Archipiélago Socotra', type: 'marine' },
];

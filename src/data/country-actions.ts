/**
 * Country accountability — a small, curated set of countries with a
 * single recent environmental action per entry (positive or negative).
 *
 * Editorial, not algorithmic. Kept deliberately short — 16 entries is enough
 * to highlight the pattern without claiming to be a ranking. Tracked against
 * the public record (Climate Action Tracker, UNEP Emissions Gap Report,
 * IEA World Energy Outlook, Global Forest Watch). Review and update every
 * quarter — stale entries do more harm than silence.
 *
 * Lat/lon: country capital or a landmark location associated with the action,
 * chosen so markers don't overlap on the globe. Not the country centroid.
 */

export type ActionSentiment = 'positive' | 'negative';

export interface CountryAction {
    code: string;        // ISO 3166-1 alpha-2 for the click-to-panel route
    country: {
        es: string;
        en: string;
    };
    sentiment: ActionSentiment;
    headline: {
        es: string;
        en: string;
    };
    detail: {
        es: string;
        en: string;
    };
    source: string;      // short attribution, e.g. "Climate Action Tracker 2025"
    lat: number;
    lon: number;
}

export const COUNTRY_ACTIONS: CountryAction[] = [
    // ── Positive ─────────────────────────────────────────────────────────
    {
        code: 'CR',
        country: { es: 'Costa Rica', en: 'Costa Rica' },
        sentiment: 'positive',
        headline: {
            es: '99% electricidad renovable',
            en: '99% renewable electricity',
        },
        detail: {
            es: 'Más de una década operando la red nacional casi enteramente con hidroeléctrica, geotermia, eólica y solar. Pionero en pagos por servicios ecosistémicos.',
            en: 'More than a decade running the national grid almost entirely on hydro, geothermal, wind and solar. Pioneer of payments for ecosystem services.',
        },
        source: 'ICE / Climate Action Tracker',
        lat: 9.7489,
        lon: -83.7534,
    },
    {
        code: 'UY',
        country: { es: 'Uruguay', en: 'Uruguay' },
        sentiment: 'positive',
        headline: {
            es: '98% electricidad renovable',
            en: '98% renewable electricity',
        },
        detail: {
            es: 'Pasó de ~40% a >98% renovable en una década, principalmente a través de energía eólica. Sin subsidios a combustibles fósiles.',
            en: 'Moved from ~40% to >98% renewable in a decade, mostly wind. No fossil-fuel subsidies.',
        },
        source: 'IEA / UTE',
        lat: -32.5228,
        lon: -55.7658,
    },
    {
        code: 'NO',
        country: { es: 'Noruega', en: 'Norway' },
        sentiment: 'positive',
        headline: {
            es: '>90% de nuevos autos son eléctricos',
            en: '>90% of new cars are electric',
        },
        detail: {
            es: 'La adopción de VE más rápida del mundo. Contradicción abierta: sigue siendo gran exportador de petróleo y gas.',
            en: "World's fastest EV adoption. Open contradiction: still a major oil and gas exporter.",
        },
        source: 'Norwegian EV Association',
        lat: 60.4720,
        lon: 8.4689,
    },
    {
        code: 'BT',
        country: { es: 'Bután', en: 'Bhutan' },
        sentiment: 'positive',
        headline: {
            es: 'País carbono-negativo',
            en: 'Carbon-negative country',
        },
        detail: {
            es: 'Sus bosques absorben más CO₂ del que el país emite. Constitución obliga a mantener al menos 60% de cobertura forestal.',
            en: 'Forests absorb more CO₂ than the country emits. Constitution mandates at least 60% forest cover.',
        },
        source: 'UNFCCC NDC',
        lat: 27.5142,
        lon: 90.4336,
    },
    {
        code: 'IS',
        country: { es: 'Islandia', en: 'Iceland' },
        sentiment: 'positive',
        headline: {
            es: 'Captura directa de carbono a escala',
            en: 'Direct-air carbon capture at scale',
        },
        detail: {
            es: 'Planta Orca + Mammoth (Climeworks) captura CO₂ del aire y lo mineraliza en basalto. Red eléctrica 100% renovable (geotermia, hidroeléctrica).',
            en: 'Orca + Mammoth plants (Climeworks) pull CO₂ from air and mineralise it in basalt. 100% renewable grid (geothermal, hydro).',
        },
        source: 'Climeworks / Carbfix',
        lat: 64.9631,
        lon: -19.0208,
    },
    {
        code: 'MA',
        country: { es: 'Marruecos', en: 'Morocco' },
        sentiment: 'positive',
        headline: {
            es: 'Noor: mayor planta solar concentrada del mundo',
            en: 'Noor: world\'s largest concentrated solar plant',
        },
        detail: {
            es: 'Complejo Noor Ouarzazate: 580 MW, almacenamiento de sal fundida. Meta de 52% renovable al 2030.',
            en: 'Noor Ouarzazate complex: 580 MW with molten-salt storage. Target of 52% renewable by 2030.',
        },
        source: 'MASEN / IRENA',
        lat: 30.9335,
        lon: -6.8629,
    },
    {
        code: 'KE',
        country: { es: 'Kenia', en: 'Kenya' },
        sentiment: 'positive',
        headline: {
            es: '~90% electricidad renovable (geotermia, eólica)',
            en: '~90% renewable electricity (geothermal, wind)',
        },
        detail: {
            es: 'Olkaria, el mayor campo geotérmico de África. Turbina Lake Turkana: 310 MW eólicos. Contribuye al Great Green Wall.',
            en: 'Olkaria, Africa\'s largest geothermal field. Lake Turkana: 310 MW of wind. Contributes to the Great Green Wall.',
        },
        source: 'KenGen / IEA',
        lat: -0.0236,
        lon: 37.9062,
    },
    {
        code: 'DK',
        country: { es: 'Dinamarca', en: 'Denmark' },
        sentiment: 'positive',
        headline: {
            es: 'Primer país en pagar "pérdidas y daños"',
            en: 'First country to pay "loss and damage"',
        },
        detail: {
            es: 'Reconoció en COP27 la responsabilidad climática histórica con un fondo para países vulnerables. Meta 70% reducción al 2030.',
            en: 'First at COP27 to acknowledge historical climate responsibility with a fund for vulnerable nations. 70% reduction target by 2030.',
        },
        source: 'Danish Government',
        lat: 56.2639,
        lon: 9.5018,
    },

    // ── Negative / concerning ────────────────────────────────────────────
    {
        code: 'BR',
        country: { es: 'Brasil', en: 'Brazil' },
        sentiment: 'negative',
        headline: {
            es: 'Deforestación amazónica aún alta',
            en: 'Amazon deforestation still high',
        },
        detail: {
            es: 'Aunque la tala reciente bajó ~50% desde 2023, la Amazonía sigue perdiendo área forestal al ritmo equivalente a un campo de fútbol por minuto.',
            en: 'Although recent clearing dropped ~50% since 2023, the Amazon is still losing forest at roughly one football pitch per minute.',
        },
        source: 'INPE / Global Forest Watch',
        lat: -5.4984,
        lon: -58.7653,
    },
    {
        code: 'ID',
        country: { es: 'Indonesia', en: 'Indonesia' },
        sentiment: 'negative',
        headline: {
            es: 'Turberas quemadas para aceite de palma',
            en: 'Peatlands burned for palm oil',
        },
        detail: {
            es: 'Quema de turberas libera CO₂ concentrado por siglos. Expansión continua de palma aceitera a pesar de moratoria formal.',
            en: 'Peatland fires release centuries of stored CO₂. Palm-oil expansion continues despite a formal moratorium.',
        },
        source: 'Global Forest Watch',
        lat: -0.7893,
        lon: 113.9213,
    },
    {
        code: 'RU',
        country: { es: 'Rusia', en: 'Russia' },
        sentiment: 'negative',
        headline: {
            es: 'Expansión de perforación en el Ártico',
            en: 'Arctic drilling expansion',
        },
        detail: {
            es: 'Nuevas concesiones de hidrocarburos en el mar de Barents y Kara. Sin política climática creíble al 2030.',
            en: 'New oil and gas leases in the Barents and Kara seas. No credible 2030 climate policy.',
        },
        source: 'Climate Action Tracker',
        lat: 66.0000,
        lon: 94.2500,
    },
    {
        code: 'SA',
        country: { es: 'Arabia Saudita', en: 'Saudi Arabia' },
        sentiment: 'negative',
        headline: {
            es: 'Aramco planea expandir producción a 13 Mb/d',
            en: 'Aramco plans to expand output to 13 Mb/d',
        },
        detail: {
            es: 'A pesar de un compromiso nominal de net-zero al 2060, el plan corporativo es aumentar producción petrolera en la década actual.',
            en: 'Despite a nominal 2060 net-zero pledge, the corporate plan is to raise oil production through this decade.',
        },
        source: 'IEA / Aramco filings',
        lat: 23.8859,
        lon: 45.0792,
    },
    {
        code: 'AU',
        country: { es: 'Australia', en: 'Australia' },
        sentiment: 'negative',
        headline: {
            es: 'Mayor exportador neto de carbón y GNL',
            en: 'Largest net exporter of coal and LNG',
        },
        detail: {
            es: 'Las emisiones exportadas duplican las domésticas. Nuevas aprobaciones de minas de carbón en Queensland y NSW durante 2025.',
            en: 'Exported emissions are roughly double domestic ones. Fresh coal-mine approvals in Queensland and NSW during 2025.',
        },
        source: 'Climate Council Australia',
        lat: -25.2744,
        lon: 133.7751,
    },
    {
        code: 'CN',
        country: { es: 'China', en: 'China' },
        sentiment: 'negative',
        headline: {
            es: 'Nueva capacidad de carbón supera la del resto del mundo',
            en: 'New coal capacity exceeds the rest of the world combined',
        },
        detail: {
            es: 'Paradoja abierta: lidera despliegue global de solar y eólica, pero sigue autorizando más carbón que todos los demás países juntos.',
            en: 'Open paradox: leads global solar and wind deployment, yet still permits more coal than every other country combined.',
        },
        source: 'Global Energy Monitor',
        lat: 35.8617,
        lon: 104.1954,
    },
    {
        code: 'AE',
        country: { es: 'Emiratos Árabes Unidos', en: 'United Arab Emirates' },
        sentiment: 'negative',
        headline: {
            es: 'ADNOC planea aumentar producción pese a COP28',
            en: 'ADNOC plans output growth despite COP28',
        },
        detail: {
            es: 'País anfitrión de COP28 anunció "transición away from fossil fuels" mientras acelera expansión petrolera doméstica.',
            en: 'COP28 host announced "transition away from fossil fuels" while accelerating domestic oil expansion.',
        },
        source: 'CCPI 2025',
        lat: 23.4241,
        lon: 53.8478,
    },
    {
        code: 'US',
        country: { es: 'Estados Unidos', en: 'United States' },
        sentiment: 'negative',
        headline: {
            es: 'Mayor productor histórico de CO₂',
            en: 'Largest historical CO₂ producer',
        },
        detail: {
            es: 'Aproximadamente 25% de las emisiones acumuladas globales. Inversiones de IRA coexisten con aprobaciones récord de exportación de GNL.',
            en: 'About 25% of all cumulative global emissions. IRA investments coexist with record LNG export approvals.',
        },
        source: 'Our World in Data / EIA',
        lat: 39.8283,
        lon: -98.5795,
    },
];

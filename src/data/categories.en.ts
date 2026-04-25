/**
 * English translations for the category data in `./categories.ts`.
 *
 * The Spanish strings in `categories.ts` are the baseline source of truth —
 * each entry here is an index-aligned English mirror of that source. At
 * render time, `localizedActions` / `localizedImpact` in `./categories.ts`
 * pick the array that matches the current locale.
 *
 * Shape per category:
 *   global[]     — systemic actions, same count + order as categories[i].global
 *   individual[] — personal actions, same count + order as categories[i].individual
 *   impact       — one sentence with {N} (3.5% population) and {N3} substitutions
 */

export interface CategoryI18n {
    global: string[];
    governmental: string[];
    individual: string[];
    impact: string;
}

export const categoriesEN: CategoryI18n[] = [
    // 0 — Climate & Energy
    {
        global: [
            "\u26FD Eliminate fossil-fuel subsidies ($5.9T/year)",
            "\u26A1 Decentralized, community-owned power grids",
            "\u{1F52C} Fund fusion research and energy storage",
            "\u{1F517} Transparent, verifiable carbon markets",
            "\u{1F333} Reforest 1 billion hectares",
        ],
        governmental: [
            "\u26D4 Binding fossil-fuel phase-out timeline (coal, oil, gas)",
            "\u{1F4B8} End fossil-fuel subsidies; redirect to just transition",
            "\u2696\uFE0F Carbon price that reflects real damage",
            "\u{1F50C} Mandate a 100% renewable grid with storage",
            "\u{1F686} Massive investment in public transit and rail",
        ],
        individual: [
            "\u2600\uFE0F Put solar panels on your home",
            "\u{1F6B2} Take electric transit, bike, or public transport",
            "\u{1F4A1} Cut your energy use by 30%",
            "\u{1F50B} Switch to a 100% renewable energy plan",
            "\u{1F3E0} Build with natural materials: earth, stone, wood",
        ],
        impact: "{N} acting: \u22128 to 12 GT CO\u2082/year of 40.6 GT (fossil+cement, GCB 2025)",
    },
    // 1 — Biodiversity
    {
        global: [
            "\u{1F6E1}\uFE0F Protect 30% of land and ocean by 2030",
            "\u{1F33F} Build biological corridors between protected areas",
            "\u{1F4E1} Global monitoring with sensors and AI",
            "\u{1F6AB} Ban pesticides that kill pollinators",
            "\u{1F9EC} Decentralized seed and gene banks",
        ],
        governmental: [
            "\u{1F6E1}\uFE0F Legislate 30\u00D730 (30% land + sea protected by 2030)",
            "\u270A Recognize Indigenous land tenure and community-conserved areas (OECMs)",
            "\u{1F6AB} Ban neonicotinoid pesticides and glyphosate",
            "\u{1F4B0} Fund parks with real staffing and enforcement",
            "\u{1F43A} Reintroduce keystone species (wolves, jaguars, pollinators)",
        ],
        individual: [
            "\u{1F331} Plant native-species gardens",
            "\u{1F50D} Join citizen science projects (iNaturalist)",
            "\u{1FAB5} Refuse products from deforestation",
            "\u2702\uFE0F Regenerative pruning: trees come back stronger",
            "\u{1F30D} Restore ecosystems in your community",
        ],
        impact: "{N} protect 48,000+ threatened species (IUCN)",
    },
    // 2 — Water & Oceans
    {
        global: [
            "\u{1F30A} Restore wetlands and mangroves worldwide",
            "\u{1F3ED} End industrial discharge into rivers and oceans",
            "\u{1F4A7} Desalination powered by renewables",
            "\u{1F420} Protect 30% of oceans as marine reserves",
            "\u267B\uFE0F Water reuse and recycling systems",
        ],
        governmental: [
            "\u{1F30A} Ratify the High Seas Treaty (BBNJ) and enforce it",
            "\u{1F6B1} Binding cap on primary plastic production",
            "\u{1F6A4} Ban bottom trawling and harmful fishing subsidies",
            "\u{1F4A7} Protect watersheds and community water rights",
            "\u{1F41F} No-take marine reserves across 30% of the ocean",
        ],
        individual: [
            "\u{1F327}\uFE0F Install rainwater harvesting",
            "\u{1FAA8} Natural filters: stone, sand, and plants",
            "\u{1F438} Living ponds instead of chlorine pools",
            "\u{1F9F9} Join river and beach cleanups",
            "\u26A0\uFE0F Never pour chemicals down the drain",
        ],
        impact: "{N} restore wetlands and cut discharge — every liter counts",
    },
    // 3 — Animals
    {
        global: [
            "\u{1F404} End mass industrial livestock",
            "\u{1F33E} Transition to open-air regenerative grazing",
            "\u{1F981} Ban the wildlife trade",
            "\u2696\uFE0F Legally recognize that animals feel",
            "\u{1F98C} Build wildlife crossings across roads and infrastructure",
        ],
        governmental: [
            "\u26D4 Phase out industrial confined-animal feeding operations",
            "\u{1F4DC} Recognize animals as sentient beings in law",
            "\u{1F981} Full ban on the wildlife trade",
            "\u{1F3D7}\uFE0F Mandatory wildlife crossings on highways and rail",
            "\u{1F9EA} Ban animal testing for cosmetics and household products",
        ],
        individual: [
            "\u{1F969} Eat only meat from free-range, responsible farms",
            "\u{1F43E} Adopt pets instead of buying them",
            "\u{1F9EA} Refuse products tested on animals",
            "\u{1F4E2} Report animal abuse",
            "\u{1F3E1} Support rescued-animal sanctuaries",
        ],
        impact: "{N} cut demand for industrial livestock (~80 billion animals/year, FAO)",
    },
    // 4 — Food
    {
        global: [
            "\u{1F33E} Global transition to regenerative agriculture",
            "\u{1F5D1}\uFE0F Halve food waste (1.3 billion tons/year)",
            "\u{1F916} AI-optimized food distribution",
            "\u{1F3D9}\uFE0F Large-scale vertical and urban farming",
            "\u{1F33D} Diversify crops: from 4 staple species to hundreds",
        ],
        governmental: [
            "\u{1F33E} Subsidize regenerative agriculture, not intensive agribusiness",
            "\u{1F95B} End subsidies for industrial meat and dairy",
            "\u{1F3F7}\uFE0F Mandatory climate-footprint and origin labeling",
            "\u{1F34E} School meals: fresh, local, seasonal",
            "\u267B\uFE0F National food-waste law (mandatory donation)",
        ],
        individual: [
            "\u{1F955} Eat local, seasonal food from healthy soils",
            "\u{1FAB1} Compost your organic waste",
            "\u{1F33B} Grow some of your own food",
            "\u{1F37D}\uFE0F Stop wasting food (\u221274 kg per person/year)",
            "\u{1F42E} Choose meat from regenerative farms, not factories",
        ],
        impact: "{N} cut \u22126.3 GT CO\u2082/year + 1 billion tons of food waste",
    },
    // 5 — Space
    {
        global: [
            "\u2604\uFE0F Fund planetary defense against asteroids",
            "\u{1F680} Establish human presence on other planets",
            "\u{1F6F0}\uFE0F Monitor and clean up space debris",
            "\u{1F47D} Research signals of life on other worlds",
            "\u{1F4DC} International treaties on space governance",
        ],
        governmental: [
            "\u{1F6F0}\uFE0F Regulate and enforce space-debris cleanup",
            "\u{1F30C} Light-pollution laws to preserve the night sky",
            "\u{1F4DC} Enforce the Outer Space Treaty; ban orbital weapons",
            "\u{1F91D} Equitable orbital allocation (no private monopolies)",
            "\u{1F6E1}\uFE0F Multilateral funding for planetary defense (near-Earth objects)",
        ],
        individual: [
            "\u{1F52D} Support responsible space agencies",
            "\u2B50 Contribute to citizen astronomy",
            "\u{1F4D6} Learn about risks that threaten all of humanity",
            "\u{1F9E0} Fund research on global-scale risks",
            "\u{1F319} Reduce light pollution in your area",
        ],
        impact: "{N} fund planetary defense and multi-planet backup",
    },
    // 6 — Holistic Health
    {
        global: [
            "\u{1F3E5} Universal access to basic healthcare",
            "\u{1F9A0} Global pandemic preparedness",
            "\u{1F49C} Mental health as a public priority",
            "\u{1F32C}\uFE0F End air pollution (7 million deaths/year)",
            "\u{1F510} Private, protected health data",
        ],
        governmental: [
            "\u{1F3E5} 100%-coverage universal healthcare",
            "\u{1F9E0} Legal parity for mental and physical health",
            "\u{1F32C}\uFE0F Strict WHO-aligned air-quality standards",
            "\u{1F6AD} Higher taxes on tobacco, alcohol, ultra-processed food",
            "\u{1F48A} Negotiate prices of essential medicines",
        ],
        individual: [
            "\u{1F3C3} Exercise 150+ minutes per week (+7 years of life)",
            "\u{1F634} Sleep 7\u20139 hours consistently",
            "\u{1F9D8} Meditate or practice mindfulness 10+ min/day",
            "\u{1F489} Get vaccinated and do preventive checkups",
            "\u{1F6AD} Cut alcohol, quit tobacco",
        ],
        impact: "{N} healthy reduces the preventable disease burden (WHO: 80% of chronic disease is avoidable)",
    },
    // 7 — Technology & AI
    {
        global: [
            "\u{1F916} AI aligned with the well-being of the planet",
            "\u{1F310} Universal access to internet and technology",
            "\u{1F4C2} Open-source essential technology",
            "\u{1F4CB} AI regulation with transparency and auditing",
            "\u{1F4CA} Real-time global environmental monitoring",
        ],
        governmental: [
            "\u{1F916} AI regulation with mandatory external audits",
            "\u{1F527} Right-to-repair law for electronics",
            "\u{1F513} Open-source by default for government software",
            "\u{1F6E1}\uFE0F Data sovereignty and personal-data portability",
            "\u{1F4DC} Effective antitrust against tech concentration",
        ],
        individual: [
            "\u{1F4BB} Learn computational and logical thinking",
            "\u{1F512} Use tools that protect your privacy",
            "\u{1F9EE} Contribute to distributed science projects",
            "\u{1F4F5} Cut time on addictive social feeds",
            "\u{1F527} Repair and reuse electronics",
        ],
        impact: "{N} redirect screen time to real-impact tools",
    },
    // 8 — Economy
    {
        global: [
            "\u{1F4C8} Measure progress with well-being, not only money",
            "\u267B\uFE0F Mandatory circular economy: zero waste",
            "\u{1F4B0} Universal basic income",
            "\u{1F3E6} Global tax on ultra-rich and tax havens",
            "\u{1F50E} Full transparency in production chains",
        ],
        governmental: [
            "\u{1F4B0} Tax extreme wealth and large inheritances",
            "\u{1F3E6} Public banking and sovereign funds with sustainability criteria",
            "\u{1F4CA} Beyond-GDP indicators (wellbeing, ecological footprint)",
            "\u{1F6AB} Close tax havens; mandatory beneficial-ownership registry",
            "\u{1F4BC} Living minimum wage and shorter workweek",
        ],
        individual: [
            "\u{1F6D2} Buy from responsible, local businesses",
            "\u{1F527} Repair instead of discarding",
            "\u{1FAB1} Compost instead of throwing away",
            "\u{1F91D} Share resources with your community",
            "\u{1F48E} Invest in positive-impact funds",
        ],
        impact: "{N} redirect consumption toward a circular, regenerative economy",
    },
    // 9 — Education
    {
        global: [
            "\u{1F393} Universal, quality education for all",
            "\u{1F9E9} Systems thinking in every mandatory curriculum",
            "\u{1FA99} Financial literacy from childhood",
            "\u{1F4DA} Open, free education platforms",
            "\u{1F331} Mass training in regenerative skills",
        ],
        governmental: [
            "\u{1F393} Free, high-quality universal public education",
            "\u{1F30D} Mandatory climate and ecology curriculum",
            "\u{1F468}\u200D\u{1F3EB} Professional teacher salaries",
            "\u{1F4DA} Funded libraries and open educational resources",
            "\u{1F91D} Lifelong-learning programs",
        ],
        individual: [
            "\u{1F4D6} Spend 30 minutes a day learning something new",
            "\u{1F469}\u200D\u{1F3EB} Teach others: mentor and volunteer",
            "\u2705 Verify information before sharing it",
            "\u{1F4D5} Read topics outside what you already know",
            "\u{1F5E3}\uFE0F Learn a second language",
        ],
        impact: "{N} educating 3 each \u2192 {N3} \u2192 in 2 cycles all of humanity",
    },
    // 10 — Governance
    {
        global: [
            "\u{1F5F3}\uFE0F Real, participatory, direct democracy",
            "\u{1F4CA} Full government transparency with open data",
            "\u2696\uFE0F Environmental courts with rights of nature",
            "\u{1F30D} International cooperation with binding agreements",
            "\u{1F54A}\uFE0F Restorative justice, not only punishment",
        ],
        governmental: [
            "\u{1F5F3}\uFE0F Ranked-choice voting or automatic runoff",
            "\u{1F4B8} Public campaign financing (no private money)",
            "\u{1F6E1}\uFE0F Independent anti-corruption courts",
            "\u{1F4E3} Legal protection for whistleblowers and environmental defenders",
            "\u{1F465} Binding citizens\u2019 assemblies on key issues",
        ],
        individual: [
            "\u{1F5F3}\uFE0F Vote informed in every election",
            "\u{1F3DB}\uFE0F Join citizen assemblies and decision-making",
            "\u{1F4E2} Hold your representatives accountable",
            "\u270A Support human-rights organizations",
            "\u{1F4AA} With 3.5% mobilized, no system resists",
        ],
        impact: "{N} = social tipping point (Chenoweth): no system resists",
    },
    // 11 — Consciousness
    {
        global: [
            "\u{1F31F} Planetary ethics woven into all education",
            "\u{1F43E} Integrate the well-being of all species",
            "\u{1F6D1} Reduce hyper-consumption as a cultural value",
            "\u{1F91D} Cooperation over competition as a social value",
            "\u{1F9ED} Ethical framework for AI, genetics, and new tech",
        ],
        governmental: [
            "\u{1F4F5} Right-to-disconnect (no emails outside hours)",
            "\u{1F9D8} Contemplative time in public schools",
            "\u{1FAB6} Recognize and protect Indigenous wisdom",
            "\u{1F333} Public spaces for silence and meditation",
            "\u{1F49A} National mental-health and wellbeing day",
        ],
        individual: [
            "\u{1F6CD}\uFE0F Question each purchase: do I really need this?",
            "\u{1F49B} Practice active empathy every day",
            "\u{1F33F} Connect with nature every week",
            "\u{1F64F} Practice gratitude and sufficiency",
            "\u{1F4AC} Have deep conversations about the future",
        ],
        impact: "{N} with shared vision = unstoppable critical mass",
    },
];

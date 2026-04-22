# Country Planet Lens Data

Structured environmental profiles for the 30 focus countries on planetearth.live.

## Panel UX

When a user hovers or taps a country's traffic light on the globe, they see **country-specific** data:

- Composite score (0–100) + traffic-light color (green ≥65, yellow 40–64, red <40)
- The 7 pillar scores + key tension (one-sentence framing)
- Top 5 gaps to close (current vs. target)
- Recent news (last 12 months of country-specific environmental events)

When the user **opens** one of the three Acciones categories, they see the **universal Top 5** for that category — the same list regardless of which country is selected, because these are actions that apply everywhere:

| Category | File | Scope |
|--|--|--|
| 🌍 Acciones Globales | `_global_actions.json` | Top 5 planet-level moves |
| 🏛 Acciones Gubernamentales | `_governmental_actions.json` | Top 5 things every government should do |
| 👤 Acciones Personales | `_personal_actions.json` | Top 5 things every person can do |

**Why communal:** these five levers don't really vary by country — every government needs to phase out fossils, every person reduces their impact more by moving their money than by almost anything else. Duplicating these per country would add maintenance with no added signal. The country-specific story (where they stand today, what gaps they face) stays in the country JSON.

## Files

```
data/countries/
├── _schema.json                 JSON Schema (draft-07) for per-country profile
├── _index.json                  All 30 countries, status, metadata
├── _global_actions.json         Top 5 planet-level actions
├── _governmental_actions.json   Top 5 universal government actions
├── _personal_actions.json       Top 5 universal individual actions
├── data/
│   ├── chn.json                 Country JSON (pillars, scores, gaps, recent news)
│   └── ... (30 total)
└── briefs/
    ├── chn.md                   Narrative markdown brief
    └── ... (30 total)
```

## Scope

**Phase 1: Planet Lens only.** 7 pillars (climate, forests/land, biodiversity, protected areas, pollution, agriculture, environmental governance). Weighting: climate 25%, forests 15%, biodiversity 15%, protected 10%, pollution 10%, agriculture 10%, governance 15%.

**Phase 2: Human Lens.** Parallel sibling track — democracy, rule of law, safety, HDI, press freedom. Never blended into the Planet score; shown as two traffic lights side by side.

## Update cadence

- `_global_actions.json`: every 2–4 weeks (tracks new COP outcomes, treaty developments, banking reports).
- `_governmental_actions.json`: every ~3 months (structural reforms evolve slowly).
- `_personal_actions.json`: rarely (research-backed stable levers, not news).
- Country JSONs: every 6–12 months, or when a major NDC / law / election changes trajectory.

## Sources

All profiles anchor on a shared source stack: OWID + Ember (emissions & energy), Climate Action Tracker (NDC gap), Yale EPI (composite environment), Protected Planet (30×30 coverage), IUCN Red List (biodiversity), Global Witness (defenders), Sabin Center (litigation), IMF/IEA (fossil subsidies), World Bank (context), UNFCCC NDC registry (pledges).

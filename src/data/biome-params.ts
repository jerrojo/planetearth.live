import { BiomeType, type BiomeParams, type BiomeId } from '../types';

const B = BiomeType;

// With ~20-30K terrain particles (1.8° step), each particle should be visible
// as a small textured dot that adds biome detail on top of the Blue Marble.
// Sizes ~0.018-0.035 world units, opacities 0.40-0.65.
//
// Field key (full schema in src/types/index.ts BiomeParams):
//   h = HSL hue range, s = saturation, l = lightness
//   sz = particle size, r = orbit radius, op = opacity, bl = blend ('a'|'n')
//   g = grass tier, gh = grass height, ghu = grass hue
//   wm = water mix, wh = water hue  (wetlands/cenotes/river-lake)
//   ac = accent chance, ah = accent hue, al = accent lightness, bsc = base-scale reduction
//         (volcanic/scorched biomes)

export const biomeParams: Record<BiomeId, BiomeParams> = {
    [B.OCEAN]:        {h:[.55,.62],s:[.5,.8],l:[.35,.55],sz:.012,r:5.008,op:.20,bl:'a',g:0},
    [B.TROPICAL_RAIN]:{h:[.25,.35],s:[.7,.95],l:[.22,.38],sz:.028,r:5.018,op:.55,bl:'n',g:3,gh:[.04,.08],ghu:[.24,.34]},
    [B.TEMPERATE_FOR]:{h:[.30,.42],s:[.5,.8],l:[.28,.45],sz:.026,r:5.015,op:.50,bl:'n',g:2,gh:[.03,.06],ghu:[.28,.40]},
    [B.BOREAL_FOR]:   {h:[.28,.36],s:[.4,.7],l:[.18,.32],sz:.026,r:5.015,op:.52,bl:'n',g:2,gh:[.02,.05],ghu:[.26,.34]},
    [B.SAVANNA]:      {h:[.10,.17],s:[.5,.8],l:[.42,.58],sz:.022,r:5.012,op:.50,bl:'n',g:1,gh:[.015,.03],ghu:[.08,.16]},
    [B.GRASSLAND]:    {h:[.20,.32],s:[.45,.65],l:[.35,.52],sz:.024,r:5.014,op:.52,bl:'n',g:2,gh:[.02,.045],ghu:[.18,.30]},
    [B.STEPPE]:       {h:[.06,.13],s:[.2,.45],l:[.35,.50],sz:.022,r:5.012,op:.45,bl:'n',g:1,gh:[.01,.025],ghu:[.06,.14]},
    [B.HOT_DESERT]:   {h:[.08,.13],s:[.5,.8],l:[.38,.50],sz:.024,r:5.012,op:.52,bl:'n',g:0},
    [B.COLD_DESERT]:  {h:[.05,.10],s:[.1,.3],l:[.32,.45],sz:.022,r:5.012,op:.45,bl:'n',g:0},
    [B.MOUNTAIN]:     {h:[.04,.08],s:[.08,.25],l:[.30,.45],sz:.032,r:[5.02,5.06],op:.50,bl:'n',g:0},
    [B.VOLCANIC]:     {h:[.0,.03],s:[.05,.20],l:[.15,.28],sz:.028,r:[5.02,5.05],op:.52,bl:'n',g:0,ac:.15,ah:[.0,.06],al:[.35,.50],bsc:.15},
    [B.TROP_COAST]:   {h:[.45,.52],s:[.6,.9],l:[.35,.48],sz:.020,r:5.010,op:.50,bl:'n',g:0},
    [B.WHITE_SAND]:   {h:[.10,.15],s:[.05,.15],l:[.48,.60],sz:.018,r:5.011,op:.50,bl:'n',g:0},
    [B.BLACK_SAND]:   {h:[.0,.05],s:[.0,.1],l:[.12,.22],sz:.018,r:5.011,op:.50,bl:'n',g:0},
    [B.SALT_FLAT]:    {h:[.0,.0],s:[.0,.05],l:[.50,.62],sz:.026,r:5.011,op:.50,bl:'n',g:0},
    [B.WETLAND]:      {h:[.28,.38],s:[.5,.8],l:[.22,.35],sz:.022,r:5.012,op:.50,bl:'n',g:1,gh:[.01,.03],ghu:[.26,.34],wm:.3,wh:[.55,.60]},
    [B.CENOTE]:       {h:[.28,.38],s:[.5,.7],l:[.25,.40],sz:.020,r:5.013,op:.52,bl:'n',g:1,gh:[.02,.04],ghu:[.26,.36],wm:.25,wh:[.58,.65]},
    [B.TUNDRA]:       {h:[.08,.16],s:[.15,.35],l:[.30,.42],sz:.022,r:5.012,op:.45,bl:'n',g:0},
    [B.ICE_CAP]:      {h:[.55,.60],s:[.10,.25],l:[.42,.55],sz:.028,r:5.016,op:.50,bl:'n',g:0},
    [B.SNOW_GLACIER]: {h:[.58,.63],s:[.05,.15],l:[.40,.52],sz:.024,r:5.014,op:.45,bl:'n',g:0},
    [B.RIVER_LAKE]:   {h:[.56,.62],s:[.6,.9],l:[.38,.52],sz:.024,r:5.013,op:.52,bl:'n',g:0},
};

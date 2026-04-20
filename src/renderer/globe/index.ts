import * as THREE from 'three';
import { ll2v } from '../../utils/math';
import { cities, type CityData } from '../../data/cities';
import { biodiversityHotspots } from '../../data/biodiversity-hotspots';
import { initLandMask, landMaskReady } from './land-mask';
import { generateTerrain } from './terrain';
import { getWind } from '../particles/wind-flow';

export interface CloudContext {
    /** Per-cloud latitude in degrees (drifts over time via wind field). */
    lats: Float32Array;
    /** Per-cloud longitude in degrees. */
    lons: Float32Array;
    /** Per-cloud radius (altitude above globe surface). */
    radii: Float32Array;
    /** Cloud age in seconds — used to respawn near climatological band. */
    ages: Float32Array;
    /** Max age before respawn. */
    maxAges: Float32Array;
    /** Raw BufferGeometry — positions are rewritten each frame. */
    geometry: THREE.BufferGeometry;
    /** Underlying position Float32Array (3 floats per cloud). */
    positions: Float32Array;
    /** ShaderMaterial for the cloud Points — exposes uTime for fBm drift. */
    material: THREE.ShaderMaterial;
}

export interface GlobeObjects {
    globeGroup: THREE.Group;
    cloudGroup: THREE.Group;
    cloudCtx: CloudContext;
    cityDots: THREE.Mesh[];
    hotspotGroup: THREE.Group;
    oceanMaterial: THREE.ShaderMaterial;
}

// Create a warm radial glow texture for city dots (Pixar golden warmth)
function createCityGlowTexture(): THREE.Texture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,240,200,1)');
    gradient.addColorStop(0.25, 'rgba(255,220,160,0.6)');
    gradient.addColorStop(0.5, 'rgba(255,200,120,0.2)');
    gradient.addColorStop(1, 'rgba(255,180,100,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
}

// Premium atmosphere with Fresnel-based glow (inspired by GitHub Globe)
function makeAtmos(radius: number, color: number[], intensity: number, falloff: number): THREE.Mesh {
    return new THREE.Mesh(
        new THREE.SphereGeometry(radius, 64, 64),
        new THREE.ShaderMaterial({
            vertexShader: /* glsl */ `
                varying vec3 vNormal;
                varying vec3 vViewDir;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
                    vViewDir = normalize(-mvPos.xyz);
                    gl_Position = projectionMatrix * mvPos;
                }
            `,
            fragmentShader: /* glsl */ `
                varying vec3 vNormal;
                varying vec3 vViewDir;
                void main() {
                    // Fresnel-based rim glow
                    float fresnel = 1.0 - abs(dot(vNormal, vViewDir));
                    float glow = pow(fresnel, ${(2.5 / falloff).toFixed(2)}) * ${intensity.toFixed(2)};

                    // Soft gradient falloff for premium halo feel
                    float softEdge = smoothstep(0.0, 1.0, fresnel);
                    glow *= softEdge;

                    vec3 col = vec3(${color.join(',')});
                    gl_FragColor = vec4(col * glow, glow * 0.85);
                }
            `,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide,
            transparent: true,
            depthWrite: false,
        })
    );
}

// GitHub-style outer halo — a large backside sphere with soft gradient
function makeOuterHalo(scene: THREE.Scene): void {
    const haloGeo = new THREE.SphereGeometry(7.5, 64, 64);
    const haloMat = new THREE.ShaderMaterial({
        vertexShader: /* glsl */ `
            varying vec3 vNormal;
            varying vec3 vViewDir;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
                vViewDir = normalize(-mvPos.xyz);
                gl_Position = projectionMatrix * mvPos;
            }
        `,
        fragmentShader: /* glsl */ `
            varying vec3 vNormal;
            varying vec3 vViewDir;
            void main() {
                float rim = 1.0 - abs(dot(vNormal, vViewDir));
                float glow = pow(rim, 3.5) * 0.05;
                vec3 color = mix(
                    vec3(0.10, 0.08, 0.04),
                    vec3(0.10, 0.30, 0.70),
                    rim * 0.6
                );
                gl_FragColor = vec4(color * glow, glow);
            }
        `,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.scale.multiplyScalar(1.15);
    halo.rotateX(Math.PI * 0.03);
    halo.rotateY(Math.PI * 0.03);
    scene.add(halo);
}

export function createGlobe(scene: THREE.Scene): GlobeObjects {
    // Init land mask first
    initLandMask();

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // Ocean sphere — Pixar deep blue with sun-directional specular highlight
    // Specular reflection gated by sun direction for physically-correct ocean glint
    const oceanMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uSunDir: { value: new THREE.Vector3(1, 0.3, 0) },
            uColor1: { value: new THREE.Color(0x060b18) },
            uColor2: { value: new THREE.Color(0x0c1e42) },
        },
        vertexShader: /* glsl */ `
            varying vec3 vNormal;
            varying vec3 vWorldPos;
            varying vec2 vUv;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: /* glsl */ `
            uniform float uTime;
            uniform vec3 uSunDir;
            uniform vec3 uColor1;
            uniform vec3 uColor2;
            varying vec3 vNormal;
            varying vec3 vWorldPos;
            varying vec2 vUv;
            void main() {
                vec3 N = normalize(vNormal);
                vec3 V = normalize(cameraPosition - vWorldPos);

                // Gradient based on latitude (y-component of normal)
                float lat = N.y * 0.5 + 0.5;
                vec3 baseColor = mix(uColor1, uColor2, lat * 0.6 + 0.2);

                // Fresnel rim glow — subtle atmospheric scattering at limb only
                float fresnel = pow(1.0 - max(dot(N, V), 0.0), 4.0);
                baseColor += vec3(0.03, 0.04, 0.10) * fresnel;

                // Sun-directional specular highlight (Blinn-Phong)
                // Subtle glint where sun reflects toward camera — not dominating
                vec3 H = normalize(uSunDir + V);  // half-vector
                float spec = pow(max(dot(N, H), 0.0), 128.0); // tight highlight
                // Gate by sun-facing: only lit hemisphere gets specular
                float sunFacing = max(dot(N, uSunDir), 0.0);
                vec3 sunGlint = vec3(0.05, 0.04, 0.02) * spec * sunFacing;
                baseColor += sunGlint;

                // Very subtle warm tint at grazing angles on sun-lit side only
                float warmRim = pow(fresnel, 3.0) * sunFacing;
                baseColor += vec3(0.02, 0.015, 0.005) * warmRim;

                gl_FragColor = vec4(baseColor, 0.95);
            }
        `,
        transparent: true,
    });
    const oceanMesh = new THREE.Mesh(new THREE.SphereGeometry(5, 64, 64), oceanMat);
    globeGroup.add(oceanMesh);

    // Land base layer — NASA Blue Marble texture for real geography
    // Gives pixel-accurate continent shapes + realistic coloring.
    // IMPORTANT: this layer must be OPAQUE and write depth, so the entire globe
    // renders as a solid sphere even before biome particles layer on top. An
    // earlier iteration kept this transparent with depthWrite:false, which —
    // combined with the ocean shader underneath — caused a "cellular/pointillist"
    // failure mode when transparency sorting flipped the draw order.
    const earthTex = new THREE.TextureLoader().load(
        '/textures/earth-blue-marble.jpg',
        (tex) => { tex.needsUpdate = true; },
        undefined,
        (err) => {
            // Swallow but log — the globe still renders with ocean shader + particles
            // if the texture fails, but we want visibility in the console.
            // eslint-disable-next-line no-console
            console.warn('[globe] Blue Marble texture failed to load:', err);
        },
    );
    earthTex.colorSpace = THREE.SRGBColorSpace;
    earthTex.anisotropy = 8;
    const landBaseMat = new THREE.ShaderMaterial({
        uniforms: {
            uTex: { value: earthTex },
        },
        vertexShader: /* glsl */ `
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vWorldPos;
            void main() {
                vUv = uv;
                vNormal = normalize(normalMatrix * normal);
                vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: /* glsl */ `
            uniform sampler2D uTex;
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vWorldPos;
            void main() {
                vec3 texCol = texture2D(uTex, vUv).rgb;

                // Pixar grade: let NASA Blue Marble dominate the read.
                // Gentle warm-grade lift on midtones; mild teal in deep ocean shadows so it reads rich.
                float luma = dot(texCol, vec3(0.2126, 0.7152, 0.0722));
                vec3 warmLift = vec3(1.04, 1.02, 0.94);       // golden into continents
                vec3 coolShadow = vec3(0.92, 0.95, 1.04);     // slight teal in ocean shadows
                texCol = mix(texCol * coolShadow, texCol * warmLift, smoothstep(0.10, 0.45, luma));

                // Limb darkening — Pixar rim roll-off so the edge reads as a sphere, not a flat disc
                vec3 viewDir = normalize(cameraPosition - vWorldPos);
                float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.6);
                texCol *= 1.0 - fresnel * 0.30;

                gl_FragColor = vec4(texCol, 1.0);
            }
        `,
        // Opaque + writes depth: this is the base of the globe and must be rock-solid.
        // Transparency on the base layer was the root cause of a recurring
        // "particle cellular pattern" regression — fixed by making this mesh opaque.
        transparent: false,
        depthWrite: true,
    });
    const landBaseMesh = new THREE.Mesh(new THREE.SphereGeometry(5.009, 128, 128), landBaseMat);
    landBaseMesh.renderOrder = 0; // explicit: base of the globe
    globeGroup.add(landBaseMesh);

    // Grid lines
    const gridMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.03 });
    for (let lat = -80; lat <= 80; lat += 20) {
        const pts: THREE.Vector3[] = [];
        for (let lon = -180; lon <= 180; lon += 4) pts.push(ll2v(lat, lon, 5.005));
        globeGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
    }
    for (let lon = -180; lon < 180; lon += 30) {
        const pts: THREE.Vector3[] = [];
        for (let lat = -90; lat <= 90; lat += 4) pts.push(ll2v(lat, lon, 5.005));
        globeGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
    }

    // Terrain — generate immediately with fallback mask, then regenerate with real mask
    // This avoids a blank globe on first frame while ensuring accurate coastlines
    let terrainGroup = new THREE.Group();
    globeGroup.add(terrainGroup);

    function buildTerrain(): void {
        // Remove previous terrain
        while (terrainGroup.children.length > 0) {
            const child = terrainGroup.children[0];
            terrainGroup.remove(child);
            if (child instanceof THREE.Points || child instanceof THREE.LineSegments) {
                child.geometry.dispose();
                if (child.material instanceof THREE.Material) child.material.dispose();
            }
        }
        const terrain = generateTerrain();
        terrain.biomeGroups.forEach(g => terrainGroup.add(g));
        if (terrain.grassLines) terrainGroup.add(terrain.grassLines);
        terrainGroup.add(terrain.oceanPoints);
    }

    buildTerrain(); // immediate with fallback polygons

    // Rebuild with high-res specular texture once loaded (fixes coastline accuracy)
    landMaskReady().then(() => {
        buildTerrain();
    });

    // Atmosphere — rim scattering at the limb ONLY, must not wash out the continents.
    // A prior "Pixar" pass cranked intensity to 0.55 which additively over-brightened the
    // mid-globe via fresnel falloff, blowing out the blue marble texture detail.
    // Calibrated values: bright enough to read as a glow, dim enough that continents stay crisp.
    globeGroup.add(makeAtmos(5.42, [0.30, 0.62, 1.00], 0.18, 0.40));  // cyan limb rim
    globeGroup.add(makeAtmos(5.70, [0.14, 0.36, 0.78], 0.08, 0.30));  // soft outer haze

    // City dots — size scaled by population, glow colored by CO₂ per capita
    const cityDots: THREE.Mesh[] = [];
    const cityGlowTex = createCityGlowTexture();
    const maxPop = Math.max(...cities.map(c => c.popM));

    cities.forEach((city: CityData) => {
        // Dot size: 0.025 (small city) to 0.06 (megacity)
        const popFrac = city.popM / maxPop;
        const dotSize = 0.025 + popFrac * 0.035;

        const m = new THREE.Mesh(
            new THREE.SphereGeometry(dotSize, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xffe4a0 })
        );
        m.position.copy(ll2v(city.lat, city.lon, 5.04));
        globeGroup.add(m);
        cityDots.push(m);

        // Glow color by CO₂: green (<3) → amber (3-10) → red (>10 t/yr)
        let glowColor: number;
        if (city.co2pc < 3) {
            glowColor = 0x60e060; // green — low emissions
        } else if (city.co2pc < 10) {
            glowColor = 0xffd060; // amber — moderate
        } else {
            glowColor = 0xff6040; // red — high emissions
        }

        const sprite = new THREE.Sprite(
            new THREE.SpriteMaterial({
                map: cityGlowTex,
                color: glowColor,
                transparent: true,
                opacity: 0.45 + popFrac * 0.25,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            })
        );
        sprite.position.copy(m.position);
        sprite.scale.setScalar(0.2 + popFrac * 0.25);
        globeGroup.add(sprite);
    });

    // Biodiversity hotspots & protected areas — initially hidden, shown when Biodiversidad is active
    const hotspotGroup = new THREE.Group();
    hotspotGroup.visible = false; // toggled by sidebar
    const hotspotColors: Record<string, number> = {
        hotspot: 0x4ae64a,  // vibrant green
        park: 0xffe040,     // golden yellow
        marine: 0x40c0ff,   // ocean blue
    };
    const hotspotSizes: Record<string, number> = { hotspot: 0.06, park: 0.045, marine: 0.05 };

    for (const hs of biodiversityHotspots) {
        const color = hotspotColors[hs.type] ?? 0x4ae64a;
        const sz = hotspotSizes[hs.type] ?? 0.05;

        // Core marker
        const dot = new THREE.Mesh(
            new THREE.SphereGeometry(sz, 8, 8),
            new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }),
        );
        dot.position.copy(ll2v(hs.lat, hs.lon, 5.06));
        hotspotGroup.add(dot);

        // Glow ring
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(sz * 1.5, sz * 2.5, 24),
            new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25, side: THREE.DoubleSide }),
        );
        ring.position.copy(dot.position);
        ring.lookAt(0, 0, 0); // face outward from globe center
        hotspotGroup.add(ring);
    }
    globeGroup.add(hotspotGroup);

    // Cloud layer — meteorologically-accurate latitude distribution
    // Based on: Hadley cell ITCZ convergence (~5-10°N), subtropical dry zones (15-30°),
    // mid-latitude storm tracks (40-60°), polar fronts, Sahara/Arabian/Australian desert gaps
    // Sources: ISCCP cloud climatology, Hartmann (2016) "Global Physical Climatology"
    // Parent the cloud group to the globe so user drag, sidereal auto-rotation,
    // and any future earth transforms propagate automatically via Three.js's
    // scene graph — no per-frame quaternion mirror needed. Cloud particles
    // still drift locally through the wind field, producing their own pace
    // relative to the surface while staying visually attached to the planet.
    const cloudGroup = new THREE.Group();
    globeGroup.add(cloudGroup);
    const cp: number[] = [];
    const cSizes: number[] = [];
    const cAlphas: number[] = [];
    // Per-cloud state — used by updateCloudMotion() to advect clouds
    // through the procedural wind field so they drift along real atmospheric
    // circulation (trade winds westward, westerlies eastward, polar easterlies)
    // rather than rotating in rigid lock-step with the globe.
    const cLats: number[] = [];
    const cLons: number[] = [];
    const cRadii: number[] = [];
    const cAges: number[] = [];
    const cMaxAges: number[] = [];

    /**
     * Cloud probability by latitude band — models Earth's general circulation:
     *  - ITCZ (0-10°N): Deep convective cumulonimbus, very high coverage (~0.70-0.85)
     *  - Subtropical highs (15-30°): Descending air, clear skies, deserts (~0.15-0.25)
     *  - Mid-latitude storm tracks (35-60°): Frontal systems, high coverage (~0.55-0.70)
     *  - Polar regions (60-90°): Stratus, moderate coverage (~0.50-0.60)
     *  - Southern Ocean (40-65°S): Persistent stratus, very high (~0.75-0.85)
     */
    function cloudProbability(lat: number, lon: number): number {
        const absLat = Math.abs(lat);

        // Base probability from latitude band
        // Scaled so total cloud count is comparable to old uniform distribution (~0.20 avg)
        // but with correct RELATIVE distribution between climate zones
        let prob: number;
        if (absLat < 5) {
            // Near equator, ITCZ core — deep convection (highest relative)
            prob = 0.22;
        } else if (absLat < 15) {
            // ITCZ flanks — still elevated
            prob = lat > 0 ? 0.18 : 0.14;
        } else if (absLat < 30) {
            // Subtropical high-pressure belt — dry, subsiding air (lowest)
            prob = 0.05;
        } else if (absLat < 45) {
            // Transition to storm tracks
            prob = 0.12;
        } else if (absLat < 65) {
            // Mid-latitude storm tracks — cyclones, fronts
            prob = lat < 0 ? 0.22 : 0.18; // Southern Ocean cloudier
        } else {
            // Polar: moderate stratus
            prob = 0.14;
        }

        // Desert suppression — major subtropical deserts have minimal clouds
        // Sahara (15-30°N, -15 to 35°E)
        if (lat > 15 && lat < 32 && lon > -15 && lon < 35) prob *= 0.25;
        // Arabian (18-30°N, 35-60°E)
        if (lat > 18 && lat < 30 && lon > 35 && lon < 60) prob *= 0.30;
        // Australian outback (15-30°S, 120-150°E)
        if (lat < -15 && lat > -30 && lon > 120 && lon < 150) prob *= 0.35;
        // Atacama (15-30°S, -75 to -68°W)
        if (lat < -15 && lat > -30 && lon > -75 && lon < -68) prob *= 0.20;
        // Kalahari/Namib (15-30°S, 15-30°E)
        if (lat < -15 && lat > -30 && lon > 15 && lon < 30) prob *= 0.35;

        // Maritime enhancement — warm currents generate more evaporation & clouds
        // Gulf Stream influence (25-50°N, -80 to -40°W)
        if (lat > 25 && lat < 50 && lon > -80 && lon < -40) prob *= 1.15;

        return Math.min(prob, 0.90);
    }

    // Two altitude layers for depth — calibrated so clouds read as weather, not foam.
    // Low layer (cumulus/stratus ~2-6 km): cooler, denser, shorter fractal dimension D≈1.18-1.28.
    // High layer (cirrus ~8-12 km): warmer, thinner wisps, D≈1.37 (raggedest edges).
    // These Ds come out in the fragment shader via domain-warped fBm — see below.
    // Step widened (5→8, 8→11), sizes and alphas cut ~30% after the high-DPI overlay regression.
    const cTypes: number[] = []; // 0 = cumulus (low), 1 = cirrus (high)
    const layers = [
        { radius: 5.14, step: 8.0, sizeMin: 0.028, sizeMax: 0.065, alphaMin: 0.010, alphaMax: 0.028, type: 0 },
        { radius: 5.24, step: 11.0, sizeMin: 0.040, sizeMax: 0.095, alphaMin: 0.007, alphaMax: 0.018, type: 1 },
    ];
    for (const layer of layers) {
        for (let lat = -80; lat <= 80; lat += layer.step) {
            for (let lon = -180; lon <= 180; lon += layer.step) {
                const prob = cloudProbability(lat, lon) * (layer === layers[0] ? 1.0 : 0.7);
                if (Math.random() > prob) continue;
                const jLat = lat + (Math.random() - 0.5) * 5;
                const jLon = lon + (Math.random() - 0.5) * 5;
                const v = ll2v(jLat, jLon, layer.radius);
                cp.push(v.x, v.y, v.z);
                cSizes.push(layer.sizeMin + Math.random() * (layer.sizeMax - layer.sizeMin));
                cAlphas.push(layer.alphaMin + Math.random() * (layer.alphaMax - layer.alphaMin));
                cTypes.push(layer.type);
                cLats.push(jLat);
                cLons.push(jLon);
                cRadii.push(layer.radius);
                cAges.push(Math.random() * 120); // stagger
                // Realistic cloud lifetimes: cumulus ~20 min, stratus ~hours, cyclones ~days.
                // In sim-time we use 60-180s so users see a full life cycle.
                cMaxAges.push(60 + Math.random() * 120);
            }
        }
    }

    const cloudGeo = new THREE.BufferGeometry();
    cloudGeo.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3));
    cloudGeo.setAttribute('aSize', new THREE.Float32BufferAttribute(cSizes, 1));
    cloudGeo.setAttribute('aAlpha', new THREE.Float32BufferAttribute(cAlphas, 1));
    cloudGeo.setAttribute('aType', new THREE.Float32BufferAttribute(cTypes, 1));

    // Per-cloud hash used by the fragment shader to decorrelate fBm noise —
    // without it, every point would sample the same fractal pattern and the
    // globe would look like a quilt. Uses position as a cheap deterministic hash.
    const cHash = new Float32Array(cp.length / 3);
    for (let i = 0; i < cHash.length; i++) {
        cHash[i] = (cp[i * 3] * 12.9898 + cp[i * 3 + 1] * 78.233 + cp[i * 3 + 2] * 37.719) % 1;
        if (cHash[i] < 0) cHash[i] += 1;
    }
    cloudGeo.setAttribute('aHash', new THREE.Float32BufferAttribute(cHash, 1));

    const cloudMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
            uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
            uTime:       { value: 0 },
        },
        vertexShader: /* glsl */ `
            attribute float aSize;
            attribute float aAlpha;
            attribute float aType;
            attribute float aHash;
            varying float vAlpha;
            varying float vType;
            varying float vHash;
            uniform float uPixelRatio;
            void main() {
                vAlpha = aAlpha;
                vType = aType;
                vHash = aHash;
                vec4 mv = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = aSize * uPixelRatio * (300.0 / -mv.z);
                gl_Position = projectionMatrix * mv;
            }
        `,
        fragmentShader: /* glsl */ `
            varying float vAlpha;
            varying float vType;
            varying float vHash;
            uniform float uTime;

            // 2-D value noise — cheap, enough for fractal edge crinkle.
            // Grounded in Lovejoy (1982): cloud perimeters have fractal D≈1.18-1.37,
            // so a 3-octave fBm gives the recognizable "ragged silhouette" without
            // looking like a perfect disc.
            float hash21(vec2 p) {
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
            }
            float noise2(vec2 p) {
                vec2 i = floor(p), f = fract(p);
                vec2 u = f * f * (3.0 - 2.0 * f);
                return mix(mix(hash21(i + vec2(0,0)), hash21(i + vec2(1,0)), u.x),
                           mix(hash21(i + vec2(0,1)), hash21(i + vec2(1,1)), u.x), u.y);
            }
            // Domain-warped fBm — the Quilez trick. Without warping, fBm looks
            // like noise; with it, it swirls like real cloud turbulence.
            float fbm(vec2 p) {
                float v = 0.0;
                float a = 0.5;
                for (int i = 0; i < 3; i++) {
                    v += a * noise2(p);
                    p *= 2.0;
                    a *= 0.5;
                }
                return v;
            }

            void main() {
                vec2 uv = gl_PointCoord - 0.5;
                float d = length(uv) * 2.0;
                if (d > 1.0) discard;
                float core = smoothstep(1.0, 0.0, d); // soft radial falloff

                // Fractal edge crinkle — each cloud gets its own patch of fBm,
                // domain-warped by a secondary fBm so the silhouette swirls.
                // vHash decorrelates clouds so they don't all share a pattern.
                vec2 np = uv * 2.4 + vec2(vHash * 40.0, vHash * 17.0) + vec2(uTime * 0.015, 0.0);
                vec2 warp = vec2(fbm(np + 1.7), fbm(np + 4.3)) - 0.5;
                float fractal = fbm(np + warp * 1.2);
                // Cirrus edges are raggedier (higher D); cumulus edges are smoother.
                float edgeBite = mix(0.55, 0.85, vType) * fractal;
                float alpha = core * vAlpha * (0.45 + 0.85 * fractal) * (1.0 - smoothstep(0.85 - 0.3 * vType, 1.0, d) * (1.0 - edgeBite));
                if (alpha < 0.0025) discard;

                // Altitude-dependent color: low cumulus cool-blue-grey,
                // high cirrus warmer-gold (icy crystals scatter more into yellows).
                vec3 lowCol  = vec3(0.70, 0.75, 0.82);
                vec3 highCol = vec3(0.88, 0.86, 0.80);
                vec3 col = mix(lowCol, highCol, vType);
                // Subtle shear-band highlight (Kelvin-Helmholtz feel) — brightens
                // the leading edge when the domain warp resolves to a ridge.
                col += vec3(0.08) * smoothstep(0.55, 0.9, fractal) * (1.0 - vType * 0.4);

                gl_FragColor = vec4(col, alpha * 0.65);
            }
        `,
    });

    cloudGroup.add(new THREE.Points(cloudGeo, cloudMat));

    const cloudCtx: CloudContext = {
        lats: new Float32Array(cLats),
        lons: new Float32Array(cLons),
        radii: new Float32Array(cRadii),
        ages: new Float32Array(cAges),
        maxAges: new Float32Array(cMaxAges),
        geometry: cloudGeo,
        positions: cloudGeo.attributes['position'].array as Float32Array,
        material: cloudMat,
    };

    // GitHub-style outer halo (behind everything)
    makeOuterHalo(scene);

    return { globeGroup, cloudGroup, cloudCtx, cityDots, hotspotGroup, oceanMaterial: oceanMat };
}

/**
 * Advect each cloud through the procedural wind field from wind-flow.ts.
 *
 * Scientific grounding:
 *  - Clouds in Earth's atmosphere drift with prevailing surface-layer winds:
 *    trade winds (0-30°) blow westward, mid-latitude westerlies (30-60°)
 *    blow eastward, polar easterlies (>60°) blow westward.
 *  - Near the ITCZ, weak mean winds let clouds pile up into the characteristic
 *    equatorial cloud band visible from space.
 *  - Storm-track latitudes (~40-60°) sweep clouds around at 10 m/s typical.
 *  - Clouds are advected at ~30% the speed used for wind-flow "streamline"
 *    particles because cloud masses are larger and slower than schematic
 *    streamline tracers.
 *
 * Clouds respawn near the climatological band when they age out, so the
 * long-term distribution converges back to ISCCP (avoiding desert drift).
 */
export function updateCloudMotion(ctx: CloudContext, t: number, dt: number, motionScale: number): void {
    // Tick the shader clock regardless of motionScale — even when the globe is
    // paused, a touch of fBm drift keeps edges alive instead of freezing solid.
    ctx.material.uniforms['uTime']!.value = t;

    const scaledDt = dt * motionScale;
    if (scaledDt <= 0) return;

    const count = ctx.lats.length;
    for (let i = 0; i < count; i++) {
        ctx.ages[i] += scaledDt;

        // Respawn on age-out — pick a new random location weighted by
        // climatological cloud probability. Keeps cloud population faithful
        // to ISCCP while allowing free local advection.
        if (ctx.ages[i] >= ctx.maxAges[i]) {
            // Simple rejection sample over a few tries — cheap, runs at
            // ~once per minute per cloud so total cost is trivial.
            for (let attempt = 0; attempt < 8; attempt++) {
                const newLat = (Math.random() - 0.5) * 160;
                const newLon = (Math.random() - 0.5) * 360;
                const prob = cloudProbabilityFor(newLat, newLon);
                if (Math.random() < prob) {
                    ctx.lats[i] = newLat;
                    ctx.lons[i] = newLon;
                    break;
                }
            }
            ctx.ages[i] = 0;
        }

        // Advect by local wind. getWind returns m/s.
        // Scale factor 0.05 converts to °/s at 1 m/s — so a 10 m/s wind
        // moves a cloud 0.5°/s, which reads as slow drift at camera distance.
        const lat = ctx.lats[i];
        const lon = ctx.lons[i];
        const [u, v] = getWind(lat, lon, t);
        const cosLat = Math.max(Math.cos(lat * Math.PI / 180), 0.1);
        const newLon = lon + u * scaledDt * 0.05 / cosLat;
        const newLat = lat + v * scaledDt * 0.05;

        // Wrap longitude, clamp latitude (avoid pole singularity)
        ctx.lons[i] = newLon > 180 ? newLon - 360 : newLon < -180 ? newLon + 360 : newLon;
        ctx.lats[i] = Math.max(-85, Math.min(85, newLat));

        // Reproject to 3D
        const r = ctx.radii[i];
        const latRad = ctx.lats[i] * Math.PI / 180;
        const lonRad = ctx.lons[i] * Math.PI / 180;
        const cl = Math.cos(latRad);
        ctx.positions[i * 3]     = r * cl * Math.cos(lonRad);
        ctx.positions[i * 3 + 1] = r * Math.sin(latRad);
        ctx.positions[i * 3 + 2] = r * cl * Math.sin(lonRad);
    }

    ctx.geometry.attributes['position'].needsUpdate = true;
}

/**
 * Exported for the respawn step inside updateCloudMotion.
 * Keeps ISCCP-calibrated climatology outside the closure without duplicating code.
 */
function cloudProbabilityFor(lat: number, lon: number): number {
    const absLat = Math.abs(lat);
    let prob: number;
    if (absLat < 5) prob = 0.22;
    else if (absLat < 15) prob = lat > 0 ? 0.18 : 0.14;
    else if (absLat < 30) prob = 0.05;
    else if (absLat < 45) prob = 0.12;
    else if (absLat < 65) prob = lat < 0 ? 0.22 : 0.18;
    else prob = 0.14;

    if (lat > 15 && lat < 32 && lon > -15 && lon < 35) prob *= 0.25;
    if (lat > 18 && lat < 30 && lon > 35 && lon < 60) prob *= 0.30;
    if (lat < -15 && lat > -30 && lon > 120 && lon < 150) prob *= 0.35;
    if (lat < -15 && lat > -30 && lon > -75 && lon < -68) prob *= 0.20;
    if (lat < -15 && lat > -30 && lon > 15 && lon < 30) prob *= 0.35;
    if (lat > 25 && lat < 50 && lon > -80 && lon < -40) prob *= 1.15;

    return Math.min(prob, 0.90);
}

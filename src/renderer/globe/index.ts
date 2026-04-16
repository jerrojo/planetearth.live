import * as THREE from 'three';
import { ll2v } from '../../utils/math';
import { cities, type CityData } from '../../data/cities';
import { biodiversityHotspots } from '../../data/biodiversity-hotspots';
import { initLandMask, landMaskReady } from './land-mask';
import { generateTerrain } from './terrain';

export interface GlobeObjects {
    globeGroup: THREE.Group;
    cloudGroup: THREE.Group;
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
    // Gives pixel-accurate continent shapes + realistic coloring
    // Particles add biome detail and artistic texture on top
    const earthTex = new THREE.TextureLoader().load('/textures/earth-blue-marble.jpg');
    earthTex.colorSpace = THREE.SRGBColorSpace;
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

                // Muted so biome particles and station markers add detail on top
                texCol *= 0.55;

                // Gentle Fresnel edge darkening (limb darkening)
                vec3 viewDir = normalize(cameraPosition - vWorldPos);
                float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.0);
                texCol *= 1.0 - fresnel * 0.25;

                gl_FragColor = vec4(texCol, 0.95);
            }
        `,
        transparent: true,
        depthWrite: false,
    });
    const landBaseMesh = new THREE.Mesh(new THREE.SphereGeometry(5.009, 64, 64), landBaseMat);
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

    // Atmosphere — ultra-thin rim glow only, MUST NOT wash out land or obscure station markers
    // Low intensity + high Fresnel power = visible only at the extreme limb
    globeGroup.add(makeAtmos(5.45, [0.18, 0.42, 0.85], 0.10, 0.30));  // tight blue rim
    globeGroup.add(makeAtmos(5.65, [0.10, 0.25, 0.55], 0.04, 0.25));  // faint outer haze

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
    const cloudGroup = new THREE.Group();
    scene.add(cloudGroup);
    const cp: number[] = [];
    const cSizes: number[] = [];
    const cAlphas: number[] = [];

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

    // Two altitude layers for depth
    const layers = [
        { radius: 5.14, step: 5.0, sizeMin: 0.04, sizeMax: 0.09, alphaMin: 0.015, alphaMax: 0.04 },
        { radius: 5.24, step: 8.0, sizeMin: 0.06, sizeMax: 0.14, alphaMin: 0.010, alphaMax: 0.025 },
    ];
    for (const layer of layers) {
        for (let lat = -80; lat <= 80; lat += layer.step) {
            for (let lon = -180; lon <= 180; lon += layer.step) {
                const prob = cloudProbability(lat, lon) * (layer === layers[0] ? 1.0 : 0.7);
                if (Math.random() > prob) continue;
                const v = ll2v(
                    lat + (Math.random() - 0.5) * 5,
                    lon + (Math.random() - 0.5) * 5,
                    layer.radius,
                );
                cp.push(v.x, v.y, v.z);
                cSizes.push(layer.sizeMin + Math.random() * (layer.sizeMax - layer.sizeMin));
                cAlphas.push(layer.alphaMin + Math.random() * (layer.alphaMax - layer.alphaMin));
            }
        }
    }

    const cloudGeo = new THREE.BufferGeometry();
    cloudGeo.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3));
    cloudGeo.setAttribute('aSize', new THREE.Float32BufferAttribute(cSizes, 1));
    cloudGeo.setAttribute('aAlpha', new THREE.Float32BufferAttribute(cAlphas, 1));

    const cloudMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
            uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        },
        vertexShader: /* glsl */ `
            attribute float aSize;
            attribute float aAlpha;
            varying float vAlpha;
            uniform float uPixelRatio;
            void main() {
                vAlpha = aAlpha;
                vec4 mv = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = aSize * uPixelRatio * (300.0 / -mv.z);
                gl_Position = projectionMatrix * mv;
            }
        `,
        fragmentShader: /* glsl */ `
            varying float vAlpha;
            void main() {
                // Soft radial falloff — creates circular cloud puffs
                vec2 uv = gl_PointCoord - 0.5;
                float d = length(uv) * 2.0;
                float alpha = smoothstep(1.0, 0.3, d) * vAlpha;
                if (alpha < 0.005) discard;
                // Pixar clouds: warm white with subtle golden tint (muted to not wash out globe)
                gl_FragColor = vec4(0.85, 0.83, 0.78, alpha);
            }
        `,
    });

    cloudGroup.add(new THREE.Points(cloudGeo, cloudMat));

    // GitHub-style outer halo (behind everything)
    makeOuterHalo(scene);

    return { globeGroup, cloudGroup, cityDots, hotspotGroup, oceanMaterial: oceanMat };
}

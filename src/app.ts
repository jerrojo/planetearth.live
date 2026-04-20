import * as THREE from 'three';
import { METRIC_UPDATE_INTERVAL, API_REFRESH_INTERVAL } from './config/constants';

// Renderer & post-processing
import { createSceneContext, handleResize } from './renderer/scene-manager';
import { createGlobe, updateCloudMotion } from './renderer/globe';
import { createPostProcessing, resizePostProcessing } from './renderer/post-processing';

// Particles & effects
import { createStars } from './renderer/particles/stars';
import { createNebulas } from './renderer/particles/nebula';
import { createFireflies, updateFireflies } from './renderer/particles/fireflies';
import { updateShootingStars } from './renderer/particles/shooting-stars';
import { createPulsePool, spawnPulse, updatePulses } from './renderer/particles/pulse-rings';
import { createWindFlow, updateWindFlow } from './renderer/particles/wind-flow';
import { createSunGlow } from './renderer/effects/sun-glow';
import { createDayNight, updateDayNight, computeSunDirection } from './renderer/effects/day-night';
import { createAurora, updateAurora } from './renderer/effects/aurora';
import { createHeatmap, showHeatmap, hideHeatmap, updateHeatmap } from './renderer/effects/heatmap';
import { createConnections, updateConnections, showConnections, hideConnections } from './renderer/effects/connections';
import { createStationMarkers } from './renderer/effects/station-markers';
import { createNaturalEventMarkers } from './renderer/effects/natural-event-markers';
import { createCountryMarkers } from './renderer/effects/country-markers';
import { initStations } from './data/measurement-stations';

// UI
import { createSidebar } from './ui/components/sidebar';
import { showPanel, closePanel, initPanel, setOnCategoryChange, setOnCategoryClose } from './ui/components/panel';
import { initDashboard, updateDashboardVisuals, updateSparklines, type DashboardContext } from './ui/components/dashboard';
import { initLiveTicker } from './ui/components/live-ticker';
import { initPopulationCounter } from './ui/components/population-counter';
import { initAccessibility } from './ui/components/accessibility';
import { initActionPrompt } from './ui/components/action-prompt';

// Controls
import { createOrbitState, initOrbitControls, rotateOrbit } from './controls/orbit';

// Services
import { fetchLiveData, getStatusText } from './services/api-client';
import { updateMetrics } from './services/metrics';
import { fetchEarthquakes } from './services/earthquake-feed';

// i18n — needed to re-render liveStatus on locale toggle
import { subscribe as subscribeLocale } from './i18n';

// Layers — user-controlled optional overlays
import { isLayerEnabled, onLayerChange } from './state/layers';

// Data
import { categories } from './data/categories';

// Shared state
import { liveData } from './state/live-data';

// Scratch objects for per-frame quaternion math — allocated once at module scope.
const _Y_AXIS = new THREE.Vector3(0, 1, 0);
const _siderealQuat = new THREE.Quaternion();

export function createApp(): void {
    // Canvas
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    if (!canvas) {
        console.error('planetearth.live: canvas element not found');
        return;
    }

    // Scene
    const ctx = createSceneContext(canvas);
    const { scene, camera, renderer } = ctx;

    // Post-processing pipeline (bloom + vignette + chromatic aberration + film grain)
    const { composer, vignettePass } = createPostProcessing(renderer, scene, camera);
    const uTimeRef = vignettePass.uniforms['uTime'];
    const uGrainRef = vignettePass.uniforms['uGrainIntensity'];
    const isMobile = window.innerWidth < 768;

    // Globe
    const { globeGroup, cloudCtx, cityDots, hotspotGroup, oceanMaterial } = createGlobe(scene);

    // Day/Night terminator
    const dayNightCtx = createDayNight(globeGroup);

    // Aurora Borealis/Australis — must be in globeGroup so it rotates with the poles
    const auroraCtx = createAurora(globeGroup);

    // Heatmap overlay
    const heatmapCtx = createHeatmap(globeGroup);

    // Connection network
    const connectionsCtx = createConnections(scene);

    // Real measurement station markers
    const stationCtx = createStationMarkers(globeGroup);
    // Load station data async (NOAA buoys, tide gauges, Argo floats + hardcoded GHG/solar)
    initStations().then(() => stationCtx.rebuild());

    // Natural event markers (wildfires, volcanoes, storms from NASA EONET)
    const naturalEventMarkers = createNaturalEventMarkers(globeGroup);

    // Country accountability markers (curated editorial — positive/negative actions)
    const countryMarkersCtx = createCountryMarkers(globeGroup);

    // Particles
    const starsCtx = createStars(scene);
    createNebulas(scene);
    const fireflyCtx = createFireflies(scene);
    const sunGlowCtx = createSunGlow(scene);
    createPulsePool(globeGroup);
    // Parent wind-flow to globeGroup so streamlines rotate with user drag.
    // Previously attached to scene → particles floated in world space while
    // the globe spun underneath, looking like "clouds that don't follow the drag".
    const windCtx = createWindFlow(globeGroup);

    // UI initialization
    const catListEl = document.getElementById('catList')!;
    const mobileCatsInner = document.getElementById('mobileCatsInner')!;
    createSidebar(catListEl, mobileCatsInner, showPanel);
    initPanel();
    const dashCtx: DashboardContext = initDashboard();
    initLiveTicker(document.getElementById('dashboard')!);
    initPopulationCounter();
    const actionPrompt = initActionPrompt(dashCtx.metrics);

    // Insert action widget below planet-score, above metric cards
    const dashEl = document.getElementById('dashboard')!;
    const pillsEl = dashEl.querySelector('.metric-pills');
    if (pillsEl) {
        dashEl.insertBefore(actionPrompt.el, pillsEl);
    } else {
        dashEl.appendChild(actionPrompt.el);
    }
    const isReducedMotion = initAccessibility();

    // Wire category selection to globe effects
    setOnCategoryChange((idx: number) => {
        const cat = categories[idx];
        showHeatmap(heatmapCtx, idx, cat.color);
        showConnections(connectionsCtx, idx);
        // Show biodiversity hotspots when Biodiversidad (id:1) or Animales (id:3) is selected
        hotspotGroup.visible = (cat.id === 1 || cat.id === 3);
    });

    setOnCategoryClose(() => {
        hideHeatmap(heatmapCtx);
        hideConnections(connectionsCtx);
        hotspotGroup.visible = false;
    });

    // Controls (with inertia)
    const orbit = createOrbitState();
    initOrbitControls(canvas, orbit);

    // ── Layer visibility wiring ──────────────────────────────────────────
    // Each optional layer exposes its toggleable Object3D (wind Points,
    // natural-event Group, country markers). We sync initial state here,
    // then subscribe so Settings toggles flip visibility without needing
    // to re-enter the animation loop.
    windCtx.points.visible = isLayerEnabled('windFlow');
    naturalEventMarkers.group.visible = isLayerEnabled('naturalEvents');
    countryMarkersCtx.group.visible = isLayerEnabled('countries');
    stationCtx.group.visible = isLayerEnabled('stations');
    let filmGrainEnabled = isLayerEnabled('filmGrain');
    onLayerChange((key, value) => {
        if (key === 'windFlow') windCtx.points.visible = value;
        else if (key === 'naturalEvents') naturalEventMarkers.group.visible = value;
        else if (key === 'countries') countryMarkersCtx.group.visible = value;
        else if (key === 'stations') stationCtx.group.visible = value;
        else if (key === 'filmGrain') filmGrainEnabled = value;
    });

    // Keyboard shortcuts
    const panel = document.getElementById('panel')!;
    const a11yPanel = document.getElementById('a11yPanel')!;
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            if (panel.classList.contains('active')) closePanel();
            if (a11yPanel.classList.contains('open')) {
                a11yPanel.classList.remove('open');
                document.getElementById('a11yToggle')!.setAttribute('aria-expanded', 'false');
                document.getElementById('a11yToggle')!.focus();
            }
        }
        // Arrow keys for globe rotation (world-axis quaternion deltas — free rotation, no gimbal lock)
        const ARROW_SPEED = 0.05;
        if (e.key === 'ArrowLeft') rotateOrbit(orbit, -ARROW_SPEED, 0);
        if (e.key === 'ArrowRight') rotateOrbit(orbit, ARROW_SPEED, 0);
        if (e.key === 'ArrowUp') rotateOrbit(orbit, 0, -ARROW_SPEED);
        if (e.key === 'ArrowDown') rotateOrbit(orbit, 0, ARROW_SPEED);
        // +/- for zoom
        if (e.key === '+' || e.key === '=') orbit.zoomTarget = Math.max(9, orbit.zoomTarget - 1);
        if (e.key === '-' || e.key === '_') orbit.zoomTarget = Math.min(25, orbit.zoomTarget + 1);
    });

    // Resize (debounced to avoid expensive per-pixel setSize calls)
    let resizeTimer: ReturnType<typeof setTimeout>;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            handleResize(ctx);
            resizePostProcessing(composer, window.innerWidth, window.innerHeight);
        }, 150);
    });

    // Live data
    const liveDot = document.getElementById('liveDot')!;
    const liveStatus = document.getElementById('liveStatus')!;

    // Track last known API-connected count so we can re-translate the status
    // line on locale change without waiting for the next 60s refresh.
    let lastApisConnected = 0;
    subscribeLocale(() => {
        const status = getStatusText(lastApisConnected);
        liveStatus.textContent = status.text;
    });

    async function refreshLiveData(): Promise<void> {
        const result = await fetchLiveData();

        // Wire live API values → metric state (indices match metrics.ts order)
        if (result.co2 !== undefined) dashCtx.metrics[0].value = result.co2;               // CO₂
        if (result.temperature !== undefined) dashCtx.metrics[1].value = result.temperature; // Temp
        // Index 2 (pH), 4 (Clean Energy), 5 (Emissions) — simulated from rates
        if (result.methane !== undefined) dashCtx.metrics[6].value = result.methane;         // CH₄
        if (result.nitrous !== undefined) dashCtx.metrics[7].value = result.nitrous;         // N₂O
        if (result.arcticIce !== undefined) dashCtx.metrics[8].value = result.arcticIce;     // Arctic Ice
        if (result.pm25 !== undefined) dashCtx.metrics[9].value = result.pm25;               // PM2.5
        if (result.carbonIntensity !== undefined) dashCtx.metrics[10].value = result.carbonIntensity; // Carbon

        // Kp Index → modulate aurora intensity
        if (result.kpIndex !== undefined) {
            liveData.kpIndex = result.kpIndex;
        }

        // Natural events (wildfires, volcanoes, storms, earthquakes)
        if (result.naturalEvents) {
            liveData.naturalEvents = result.naturalEvents;
            naturalEventMarkers.rebuild();
        }

        // Sea level (NYC Battery + global)
        if (result.seaLevelNYC !== undefined) {
            liveData.seaLevelNYC = result.seaLevelNYC;
        }
        if (result.seaLevelGlobal !== undefined) {
            liveData.seaLevelGlobal = result.seaLevelGlobal;
        }
        if (result.forestLossHa !== undefined) {
            liveData.forestLossHa = result.forestLossHa;
        }
        if (result.uvIndex !== undefined) {
            liveData.uvIndex = result.uvIndex;
        }
        if (result.gbifRecentCount !== undefined) {
            liveData.gbifRecentCount = result.gbifRecentCount;
        }

        lastApisConnected = result.apisConnected;
        const status = getStatusText(result.apisConnected);
        liveStatus.textContent = status.text;
        if (status.connected) liveDot.classList.add('connected');
    }

    refreshLiveData();
    setInterval(refreshLiveData, API_REFRESH_INTERVAL);

    // Fetch live earthquake data (USGS) — refreshed every 5 minutes
    fetchEarthquakes();
    setInterval(fetchEarthquakes, 5 * 60 * 1000);

    // Reveal UI immediately — intro overlay removed for a cleaner, direct landing.
    // `loaded` class triggers the staggered fade-in of title, categories, dashboard, etc.
    requestAnimationFrame(() => {
        document.body.classList.add('loaded');
        // Action widget enters slightly later so the attention flows: globe → HUD → action.
        setTimeout(() => actionPrompt.show(), 900);
    });

    // View mode — after 60s of no interaction the UI chrome fades away so the
    // user is alone with the planet. Any pointer, key, wheel, or touch input
    // clears the idle class instantly (CSS transition handles the fade-in).
    // This plays well with Page Visibility: when the tab comes back we restart
    // the timer so the user returns to a populated HUD.
    const IDLE_MS = 60_000;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    function resetIdle(): void {
        document.body.classList.remove('idle');
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(() => document.body.classList.add('idle'), IDLE_MS);
    }
    (['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'touchmove'] as const).forEach(ev => {
        window.addEventListener(ev, resetIdle, { passive: true });
    });
    resetIdle();

    // Page Visibility API — pause render when tab is hidden (saves CPU/GPU/battery)
    let isTabVisible = true;
    document.addEventListener('visibilitychange', () => {
        isTabVisible = !document.hidden;
        if (isTabVisible) {
            clock.getDelta(); // discard stale dt after resume
            resetIdle();      // coming back to the tab counts as interaction
        }
    });

    // Animation loop
    const clock = new THREE.Clock();
    let pulseTimer = 0;
    let metricTimer = 0;
    let sparklineTimer = 0;
    let sparklineDataTimer = 0;

    function animate(): void {
        requestAnimationFrame(animate);
        if (!isTabVisible) return; // skip rendering when tab is hidden

        const dt = Math.min(clock.getDelta(), 0.1); // cap dt to avoid huge jumps
        const t = clock.getElapsedTime();
        const motionScale = isReducedMotion() ? 0 : 1;

        // Orbit inertia (smooth deceleration) — applied as quaternion deltas
        if (!orbit.isDragging) {
            orbit.velocityY *= 0.95;
            orbit.velocityX *= 0.95;
            if (Math.abs(orbit.velocityY) > 1e-5 || Math.abs(orbit.velocityX) > 1e-5) {
                rotateOrbit(orbit, orbit.velocityY, orbit.velocityX);
            }
            orbit.autoRotation += dt * 0.08 * motionScale;
        }

        // Globe orientation — compose: userQuat (free rotation) × siderealQuat (day/night)
        // Greenwich Sidereal Time: at 12:00 UTC, Greenwich (lon 0°) faces the sun.
        // computeSunDirection() uses hourAngle = (hours-12)/24 * 2π. The siderealBase
        // rotation puts longitude 0° at +Z at boot, then rotates to match the sun's
        // hour angle, so the day/night terminator aligns with real solar position.
        const utcNow = new Date();
        const utcHours = utcNow.getUTCHours() + utcNow.getUTCMinutes() / 60;
        const siderealBase = -((utcHours - 12) / 24) * Math.PI * 2;
        _siderealQuat.setFromAxisAngle(_Y_AXIS, siderealBase + orbit.autoRotation);
        globeGroup.quaternion.copy(orbit.userQuat).multiply(_siderealQuat);

        // Clouds inherit Earth's orientation automatically — cloudGroup is a child
        // of globeGroup, so user drag + sidereal spin propagate through the scene
        // graph. updateCloudMotion only advects each cloud *locally* through the
        // procedural wind field (trade winds, westerlies, polar easterlies), so
        // clouds have their own pace relative to the surface.
        updateCloudMotion(cloudCtx, t, dt, motionScale);

        // Cinematic camera breathing
        camera.position.x = Math.sin(t * 0.12) * 0.2 * motionScale;
        camera.position.y = 1.5 + Math.sin(t * 0.08) * 0.15 * motionScale;

        // Smoothly follow user's zoom target (initial position = orbit.zoomTarget, so no jump on boot).
        camera.position.z += (orbit.zoomTarget - camera.position.z) * 0.06;
        camera.lookAt(0, 0, 0);

        // Ocean uniforms (time + sun direction for specular glint)
        oceanMaterial.uniforms.uTime.value = t;
        oceanMaterial.uniforms.uSunDir.value.copy(computeSunDirection());

        // Stars twinkle
        starsCtx.material.uniforms.uTime.value = t;

        // Film grain — independent Settings → Layers toggle, also auto-disabled on mobile
        // where the cost isn't worth it. `filmGrainEnabled` is mutated by the onLayerChange
        // listener below so switching the toggle takes effect next frame.
        if (isMobile || !filmGrainEnabled) {
            uTimeRef.value = 0;
            uGrainRef.value = 0;
        } else {
            uTimeRef.value = t;
            uGrainRef.value = 0.03;
        }

        // Fireflies (CO₂ emission particles)
        updateFireflies(fireflyCtx, t, motionScale);

        // Wind flow particles (atmospheric circulation) — skip when layer is off
        if (windCtx.points.visible) {
            updateWindFlow(windCtx, t, dt, motionScale);
        }

        // Day/Night cycle (real solar position from UTC time)
        updateDayNight(dayNightCtx);
        sunGlowCtx.update(computeSunDirection());

        // Aurora
        updateAurora(auroraCtx, t, motionScale);

        // Heatmap
        updateHeatmap(heatmapCtx, t);

        // Connection network
        updateConnections(connectionsCtx, t);

        // Real measurement stations — only pulse when the layer is visible
        if (stationCtx.group.visible) stationCtx.update(t);

        // Natural event markers (NASA EONET fires, volcanoes, storms)
        if (naturalEventMarkers.group.visible) naturalEventMarkers.update(t);

        // Country accountability pulses
        if (countryMarkersCtx.group.visible) countryMarkersCtx.update(t);

        // City pulse — smoother ease
        cityDots.forEach((d, i) => {
            const pulse = 1 + Math.sin(t * 2.5 + i * 0.9) * 0.35;
            d.scale.setScalar(pulse);
        });

        // Pulse rings
        pulseTimer += dt;
        if (pulseTimer > 2.0) { spawnPulse(); pulseTimer = 0; }
        updatePulses(dt);

        // Shooting stars
        updateShootingStars(scene, dt, motionScale);

        // Metrics (throttled DOM writes)
        metricTimer += dt * 1000;
        if (metricTimer >= METRIC_UPDATE_INTERVAL) {
            updateMetrics(dashCtx.metrics, metricTimer / 1000);
            metricTimer = 0;
        }

        // Dashboard mood/HP updates (every 2 seconds)
        sparklineTimer += dt;
        if (sparklineTimer >= 2) {
            updateDashboardVisuals(dashCtx);
            sparklineTimer = 0;
        }

        // Sparkline data push + redraw (every 15 seconds)
        sparklineDataTimer += dt;
        if (sparklineDataTimer >= 15) {
            updateSparklines(dashCtx);
            sparklineDataTimer = 0;
        }

        // Render through post-processing pipeline
        composer.render();
    }

    animate();
}

import * as THREE from 'three';
import { METRIC_UPDATE_INTERVAL, API_REFRESH_INTERVAL } from './config/constants';

// Renderer & post-processing
import { createSceneContext, handleResize } from './renderer/scene-manager';
import { createGlobe } from './renderer/globe';
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
import { initStations } from './data/measurement-stations';

// UI
import { createSidebar } from './ui/components/sidebar';
import { showPanel, closePanel, initPanel, setOnCategoryChange, setOnCategoryClose } from './ui/components/panel';
import { initDashboard, updateDashboardVisuals, updateSparklines, type DashboardContext } from './ui/components/dashboard';
import { initLiveTicker } from './ui/components/live-ticker';
import { initPopulationCounter } from './ui/components/population-counter';
import { initAccessibility } from './ui/components/accessibility';
import { createIntro, getIntroCameraProgress } from './ui/components/intro';
import { initActionPrompt } from './ui/components/action-prompt';

// Controls
import { createOrbitState, initOrbitControls } from './controls/orbit';

// Services
import { fetchLiveData, getStatusText } from './services/api-client';
import { updateMetrics } from './services/metrics';
import { fetchEarthquakes } from './services/earthquake-feed';

// Data
import { categories } from './data/categories';

// Shared state
import { liveData } from './state/live-data';

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
    const { globeGroup, cloudGroup, cityDots, hotspotGroup, oceanMaterial } = createGlobe(scene);

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

    // Particles
    const starsCtx = createStars(scene);
    createNebulas(scene);
    const fireflyCtx = createFireflies(scene);
    const sunGlowCtx = createSunGlow(scene);
    createPulsePool(globeGroup);
    const windCtx = createWindFlow(scene);

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
        // Arrow keys for globe rotation
        const ARROW_SPEED = 0.05;
        if (e.key === 'ArrowLeft') orbit.rotY -= ARROW_SPEED;
        if (e.key === 'ArrowRight') orbit.rotY += ARROW_SPEED;
        if (e.key === 'ArrowUp') orbit.rotX = Math.max(-1.2, orbit.rotX - ARROW_SPEED);
        if (e.key === 'ArrowDown') orbit.rotX = Math.min(1.2, orbit.rotX + ARROW_SPEED);
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

        // Natural events
        if (result.naturalEvents) {
            liveData.naturalEvents = result.naturalEvents;
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

        const status = getStatusText(result.apisConnected);
        liveStatus.textContent = status.text;
        if (status.connected) liveDot.classList.add('connected');
    }

    refreshLiveData();
    setInterval(refreshLiveData, API_REFRESH_INTERVAL);

    // Fetch live earthquake data (USGS) — refreshed every 5 minutes
    fetchEarthquakes();
    setInterval(fetchEarthquakes, 5 * 60 * 1000);

    // Intro cinematic sequence
    const introCtx = createIntro(() => {
        // After intro finishes, reveal UI
        document.body.classList.add('loaded');
        // Show action widget inline (short delay for staggered entrance)
        setTimeout(() => actionPrompt.show(), 600);
    });

    // Page Visibility API — pause render when tab is hidden (saves CPU/GPU/battery)
    let isTabVisible = true;
    document.addEventListener('visibilitychange', () => {
        isTabVisible = !document.hidden;
        if (isTabVisible) clock.getDelta(); // discard stale dt after resume
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

        // Intro camera zoom (far space -> normal position)
        const introProgress = getIntroCameraProgress(introCtx);
        const introZoom = 50 - (50 - orbit.zoomTarget) * introProgress;

        // Orbit inertia (smooth deceleration)
        if (!orbit.isDragging) {
            orbit.velocityY *= 0.95;
            orbit.velocityX *= 0.95;
            orbit.rotY += orbit.velocityY;
            orbit.rotX += orbit.velocityX;
            orbit.rotX = Math.max(-1.2, Math.min(1.2, orbit.rotX));
            orbit.autoRotation += dt * 0.08 * motionScale;
        }

        // Globe rotation — base angle from sidereal time so day/night aligns with sun direction
        // Greenwich Sidereal Time: at 12:00 UTC, Greenwich (lon 0°) faces the sun
        // The computeSunDirection() function uses hourAngle = (hours-12)/24 * 2π
        // We need the globe rotated so that longitude 0° starts at +Z (toward camera),
        // and rotates to match the sun's hour angle.
        const utcNow = new Date();
        const utcHours = utcNow.getUTCHours() + utcNow.getUTCMinutes() / 60;
        const siderealBase = -((utcHours - 12) / 24) * Math.PI * 2;
        globeGroup.rotation.y = siderealBase + orbit.rotY + orbit.autoRotation;
        globeGroup.rotation.x = orbit.rotX;

        // Cloud rotation (slightly faster than globe for wind effect)
        cloudGroup.rotation.y = globeGroup.rotation.y + t * 0.012 * motionScale;
        cloudGroup.rotation.x = globeGroup.rotation.x;

        // Cinematic camera breathing
        camera.position.x = Math.sin(t * 0.12) * 0.2 * motionScale;
        camera.position.y = 1.5 + Math.sin(t * 0.08) * 0.15 * motionScale;

        // During intro: use intro zoom; after: use orbit zoom
        const targetZ = introCtx.isPlaying ? introZoom : orbit.zoomTarget;
        camera.position.z += (targetZ - camera.position.z) * 0.06;
        camera.lookAt(0, 0, 0);

        // Ocean uniforms (time + sun direction for specular glint)
        oceanMaterial.uniforms.uTime.value = t;
        oceanMaterial.uniforms.uSunDir.value.copy(computeSunDirection());

        // Stars twinkle
        starsCtx.material.uniforms.uTime.value = t;

        // Film grain: disabled on mobile and reduced-motion
        if (motionScale === 0 || isMobile) {
            uTimeRef.value = 0;
            uGrainRef.value = 0;
        } else {
            uTimeRef.value = t;
            uGrainRef.value = 0.03;
        }

        // Fireflies (CO₂ emission particles)
        updateFireflies(fireflyCtx, t, motionScale);

        // Wind flow particles (atmospheric circulation)
        updateWindFlow(windCtx, t, dt, motionScale);

        // Day/Night cycle (real solar position from UTC time)
        updateDayNight(dayNightCtx);
        sunGlowCtx.update(computeSunDirection());

        // Aurora
        updateAurora(auroraCtx, t, motionScale);

        // Heatmap
        updateHeatmap(heatmapCtx, t);

        // Connection network
        updateConnections(connectionsCtx, t);

        // Real measurement stations
        stationCtx.update(t);

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

/**
 * Intro Cinematic — a breathtaking zoom-in from deep space to the globe.
 * Shows key statistics with typewriter text, creating emotional impact.
 */

export interface IntroContext {
    isPlaying: boolean;
    startTime: number;
    duration: number;
    onComplete: () => void;
}

const INTRO_PHRASES = [
    { text: '1 planeta', delay: 0.3, duration: 1.2 },
    { text: '8 mil millones de personas', delay: 1.8, duration: 1.5 },
    { text: '3.5% = punto de inflexión', delay: 3.8, duration: 1.5 },
    { text: '3.5% nunca ha fallado', delay: 5.6, duration: 1.5 },
    { text: '12 categorías de impacto', delay: 7.4, duration: 1.5 },
    { text: '120 acciones concretas', delay: 9.2, duration: 1.5 },
    { text: 'Todo cambia.', delay: 11.2, duration: 2.0 },
];

const TOTAL_DURATION = 14.5; // seconds
const INTRO_SEEN_KEY = 'planetearth-intro-seen';

export function createIntro(onComplete: () => void): IntroContext {
    // Skip intro for returning users
    if (localStorage.getItem(INTRO_SEEN_KEY)) {
        const ctx: IntroContext = {
            isPlaying: false,
            startTime: 0,
            duration: 0,
            onComplete,
        };
        // Defer to next frame so caller can finish setup
        requestAnimationFrame(() => onComplete());
        return ctx;
    }

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'introOverlay';
    overlay.className = 'intro-overlay';
    overlay.setAttribute('aria-live', 'polite');

    // Create text container
    const textContainer = document.createElement('div');
    textContainer.className = 'intro-text-container';
    overlay.appendChild(textContainer);

    // Skip button
    const skipBtn = document.createElement('button');
    skipBtn.className = 'intro-skip';
    skipBtn.textContent = 'Saltar intro';
    skipBtn.setAttribute('aria-label', 'Saltar introducción');
    overlay.appendChild(skipBtn);

    document.body.appendChild(overlay);

    const ctx: IntroContext = {
        isPlaying: true,
        startTime: performance.now() / 1000,
        duration: TOTAL_DURATION,
        onComplete,
    };

    skipBtn.addEventListener('click', () => {
        finishIntro(ctx, overlay);
    });

    // Keyboard skip
    const keyHandler = (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
            finishIntro(ctx, overlay);
            document.removeEventListener('keydown', keyHandler);
        }
    };
    document.addEventListener('keydown', keyHandler);

    // Schedule text reveals
    INTRO_PHRASES.forEach(phrase => {
        setTimeout(() => {
            if (!ctx.isPlaying) return;
            const el = document.createElement('div');
            el.className = 'intro-phrase';
            el.textContent = phrase.text;
            textContainer.appendChild(el);

            // Trigger animation
            requestAnimationFrame(() => {
                el.classList.add('visible');
            });

            // Fade out after duration
            setTimeout(() => {
                if (!ctx.isPlaying) return;
                el.classList.add('fading');
            }, phrase.duration * 1000);
        }, phrase.delay * 1000);
    });

    // Auto-complete
    setTimeout(() => {
        if (ctx.isPlaying) {
            finishIntro(ctx, overlay);
        }
    }, TOTAL_DURATION * 1000);

    return ctx;
}

function finishIntro(ctx: IntroContext, overlay: HTMLElement): void {
    if (!ctx.isPlaying) return;
    ctx.isPlaying = false;

    try { localStorage.setItem(INTRO_SEEN_KEY, '1'); } catch { /* private browsing */ }

    overlay.classList.add('fade-out');
    setTimeout(() => {
        overlay.remove();
        ctx.onComplete();
    }, 800);
}

/**
 * Get intro camera zoom progress (0 = far away, 1 = normal position).
 * Used by the animation loop to interpolate camera position.
 */
export function getIntroCameraProgress(ctx: IntroContext): number {
    if (!ctx.isPlaying) return 1;
    const elapsed = performance.now() / 1000 - ctx.startTime;
    const progress = Math.min(elapsed / ctx.duration, 1);

    // Exponential ease-out for dramatic zoom
    return 1 - Math.pow(1 - progress, 3);
}

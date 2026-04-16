export function initAccessibility(): () => boolean {
    const a11yToggle = document.getElementById('a11yToggle')!;
    const a11yPanel = document.getElementById('a11yPanel')!;
    const toggleMotion = document.getElementById('toggleMotion')!;
    const toggleContrast = document.getElementById('toggleContrast')!;
    const fontSegBtns = document.querySelectorAll<HTMLButtonElement>('.font-seg-btn');

    function toggleA11yPanel(open?: boolean): void {
        const shouldOpen = typeof open === 'boolean' ? open : !a11yPanel.classList.contains('open');
        a11yPanel.classList.toggle('open', shouldOpen);
        a11yToggle.setAttribute('aria-expanded', String(shouldOpen));
        if (!shouldOpen) a11yToggle.focus();
    }

    a11yToggle.addEventListener('click', () => toggleA11yPanel());

    // Font size
    fontSegBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            fontSegBtns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-checked', 'false'); });
            btn.classList.add('active');
            btn.setAttribute('aria-checked', 'true');
            const sz = btn.dataset.size!;
            document.documentElement.classList.remove('font-small', 'font-large');
            if (sz === 'small') document.documentElement.classList.add('font-small');
            else if (sz === 'large') document.documentElement.classList.add('font-large');
            localStorage.setItem('planetearth-font-size', sz);
        });
    });

    // Reduced motion toggle
    toggleMotion.addEventListener('click', () => {
        const on = toggleMotion.getAttribute('aria-checked') !== 'true';
        toggleMotion.setAttribute('aria-checked', String(on));
        document.documentElement.classList.toggle('reduced-motion', on);
        localStorage.setItem('planetearth-reduced-motion', on ? '1' : '0');
    });

    // High contrast toggle
    toggleContrast.addEventListener('click', () => {
        const on = toggleContrast.getAttribute('aria-checked') !== 'true';
        toggleContrast.setAttribute('aria-checked', String(on));
        document.documentElement.classList.toggle('high-contrast', on);
        localStorage.setItem('planetearth-high-contrast', on ? '1' : '0');
    });

    // Restore saved preferences
    const fs = localStorage.getItem('planetearth-font-size');
    if (fs && fs !== 'medium') {
        document.documentElement.classList.add(fs === 'small' ? 'font-small' : 'font-large');
        fontSegBtns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-checked', 'false'); });
        const match = document.querySelector<HTMLButtonElement>(`.font-seg-btn[data-size="${fs}"]`);
        if (match) { match.classList.add('active'); match.setAttribute('aria-checked', 'true'); }
    }
    if (localStorage.getItem('planetearth-reduced-motion') === '1' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.documentElement.classList.add('reduced-motion');
        toggleMotion.setAttribute('aria-checked', 'true');
    }
    if (localStorage.getItem('planetearth-high-contrast') === '1') {
        document.documentElement.classList.add('high-contrast');
        toggleContrast.setAttribute('aria-checked', 'true');
    }

    // Return isReducedMotion check
    return () => document.documentElement.classList.contains('reduced-motion');
}

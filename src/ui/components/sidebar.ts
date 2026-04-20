import { categories, categoryName, categorySubtitle } from '../../data/categories';
import { subscribe } from '../../i18n';

export function createSidebar(
    catListEl: HTMLElement,
    mobileCatsInner: HTMLElement,
    onSelect: (idx: number) => void
): void {
    function render(): void {
        // Preserve any `.active` state so a locale switch while a category
        // is open doesn't visually reset the sidebar.
        const activeIdx = Array.from(catListEl.querySelectorAll('.cat-btn'))
            .findIndex(b => b.classList.contains('active'));
        catListEl.innerHTML = '';
        mobileCatsInner.innerHTML = '';

        categories.forEach((cat, i) => {
            const name = categoryName(i);
            const subtitle = categorySubtitle(i);
            // Desktop button
            const btn = document.createElement('button');
            btn.className = 'cat-btn';
            if (i === activeIdx) btn.classList.add('active');
            btn.setAttribute('aria-label', name + ' \u2014 ' + subtitle);
            btn.innerHTML = `<span class="cat-dot" style="background:${cat.color};color:${cat.color}"></span>${name}`;
            btn.onclick = () => onSelect(i);
            catListEl.appendChild(btn);

            // Mobile button
            const mBtn = document.createElement('button');
            mBtn.className = 'mobile-cat';
            if (i === activeIdx) mBtn.classList.add('active');
            mBtn.setAttribute('aria-label', name + ' \u2014 ' + subtitle);
            mBtn.innerHTML = `<span class="mc-dot" style="background:${cat.color}"></span>${name}`;
            mBtn.onclick = () => onSelect(i);
            mobileCatsInner.appendChild(mBtn);
        });
    }

    render();
    // Re-render whenever the user switches language so the sidebar labels
    // track the active locale without needing a page reload.
    subscribe(render);
}

export function setActiveCategory(idx: number): void {
    document.querySelectorAll('.cat-btn').forEach((b, j) =>
        b.classList.toggle('active', j === idx)
    );
    document.querySelectorAll('.mobile-cat').forEach((b, j) =>
        b.classList.toggle('active', j === idx)
    );
}

export function clearActiveCategory(): void {
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.mobile-cat').forEach(b => b.classList.remove('active'));
}

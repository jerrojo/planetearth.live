import { categories } from '../../data/categories';

export function createSidebar(
    catListEl: HTMLElement,
    mobileCatsInner: HTMLElement,
    onSelect: (idx: number) => void
): void {
    categories.forEach((cat, i) => {
        // Desktop button
        const btn = document.createElement('button');
        btn.className = 'cat-btn';
        btn.setAttribute('aria-label', cat.name + ' \u2014 ' + cat.subtitle);
        btn.innerHTML = `<span class="cat-dot" style="background:${cat.color};color:${cat.color}"></span>${cat.name}`;
        btn.onclick = () => onSelect(i);
        catListEl.appendChild(btn);

        // Mobile button
        const mBtn = document.createElement('button');
        mBtn.className = 'mobile-cat';
        mBtn.setAttribute('aria-label', cat.name + ' \u2014 ' + cat.subtitle);
        mBtn.innerHTML = `<span class="mc-dot" style="background:${cat.color}"></span>${cat.name}`;
        mBtn.onclick = () => onSelect(i);
        mobileCatsInner.appendChild(mBtn);
    });
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

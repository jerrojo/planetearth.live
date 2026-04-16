/**
 * Data Source Status Panel
 *
 * Renders the full provenance registry as a readable, keyboard-accessible list.
 * Users can see — for every metric — the agency that produced it, the exact URL
 * fetched, when it was last updated, validation status, and can export the
 * whole snapshot as CSV or JSON.
 *
 * This is the institutional-trust artefact. If a climate scientist or NGO
 * audits planetearth.live, this is where they verify that numbers on screen
 * come from the agency they trust.
 */

import { snapshotProvenance, type ProvenanceRecord, provenanceSummary } from '../../services/provenance';
import { downloadSnapshot } from '../../services/export';
import { t, subscribe } from '../../i18n';

let panelEl: HTMLElement | null = null;
let listEl: HTMLUListElement | null = null;
let summaryEl: HTMLElement | null = null;
let toggleEl: HTMLButtonElement | null = null;
let refreshTimer: ReturnType<typeof setInterval> | null = null;

function formatAge(ms: number | null): string {
    if (ms === null) return '—';
    const ageS = Math.max(0, (Date.now() - ms) / 1000);
    if (ageS < 60) return `${Math.round(ageS)}s`;
    if (ageS < 3600) return `${Math.round(ageS / 60)}m`;
    if (ageS < 86400) return `${Math.round(ageS / 3600)}h`;
    return `${Math.round(ageS / 86400)}d`;
}

function statusBadge(r: ProvenanceRecord): string {
    const map: Record<ProvenanceRecord['status'], string> = {
        ok: t('data.fresh'),
        stale: t('data.stale'),
        invalid: t('data.invalid'),
        offline: t('data.offline'),
        pending: t('data.pending'),
    };
    return map[r.status];
}

function renderRow(r: ProvenanceRecord): HTMLLIElement {
    const li = document.createElement('li');
    li.className = `ds-row ds-row-${r.status}`;
    li.innerHTML = `
        <div class="ds-row-head">
            <span class="ds-label"></span>
            <span class="ds-badge"></span>
        </div>
        <div class="ds-row-meta">
            <span class="ds-source"></span>
            <span class="ds-age"></span>
        </div>
        <div class="ds-row-details">
            <a class="ds-url" target="_blank" rel="noopener noreferrer"></a>
            <span class="ds-reason"></span>
        </div>
    `;
    (li.querySelector('.ds-label') as HTMLElement).textContent = r.label;
    (li.querySelector('.ds-badge') as HTMLElement).textContent = statusBadge(r);
    (li.querySelector('.ds-source') as HTMLElement).textContent = r.originalSource
        ? `${r.source} · ${r.originalSource}`
        : r.source;
    (li.querySelector('.ds-age') as HTMLElement).textContent = r.fetchedAt
        ? `${t('data.lastUpdated')}: ${formatAge(r.fetchedAt)}${r.latencyMs !== null ? ` · ${r.latencyMs}ms` : ''}`
        : r.status === 'pending' ? '—' : (t('data.offline') + ' · ' + (r.reason ?? ''));
    const urlEl = li.querySelector('.ds-url') as HTMLAnchorElement;
    urlEl.textContent = r.url;
    urlEl.href = r.url;
    const reasonEl = li.querySelector('.ds-reason') as HTMLElement;
    reasonEl.textContent = r.status === 'invalid' && r.reason ? `⚠ ${r.reason}` : '';
    return li;
}

function render(): void {
    if (!listEl || !summaryEl) return;
    const records = snapshotProvenance();
    listEl.innerHTML = '';
    for (const r of records) listEl.appendChild(renderRow(r));
    const s = provenanceSummary();
    summaryEl.textContent =
        `${s.ok} ${t('data.fresh')} · ${s.stale} ${t('data.stale')} · ${s.invalid} ${t('data.invalid')} · ${s.offline} ${t('data.offline')}`;
}

function createDom(): void {
    toggleEl = document.createElement('button');
    toggleEl.className = 'ds-toggle';
    toggleEl.type = 'button';
    toggleEl.setAttribute('aria-expanded', 'false');
    toggleEl.setAttribute('aria-controls', 'data-status-panel');
    toggleEl.textContent = t('data.sourceStatus');

    panelEl = document.createElement('section');
    panelEl.id = 'data-status-panel';
    panelEl.className = 'ds-panel';
    panelEl.setAttribute('role', 'region');
    panelEl.setAttribute('aria-label', t('data.sourceStatus'));
    panelEl.hidden = true;

    const header = document.createElement('header');
    header.className = 'ds-header';
    const h2 = document.createElement('h2');
    h2.textContent = t('data.sourceStatus');
    const summary = document.createElement('p');
    summary.className = 'ds-summary';
    summaryEl = summary;
    header.appendChild(h2);
    header.appendChild(summary);

    const actions = document.createElement('div');
    actions.className = 'ds-actions';
    const csvBtn = document.createElement('button');
    csvBtn.type = 'button';
    csvBtn.className = 'ds-export-btn';
    csvBtn.textContent = t('data.exportCsv');
    csvBtn.addEventListener('click', () => downloadSnapshot('csv'));
    const jsonBtn = document.createElement('button');
    jsonBtn.type = 'button';
    jsonBtn.className = 'ds-export-btn';
    jsonBtn.textContent = t('data.exportJson');
    jsonBtn.addEventListener('click', () => downloadSnapshot('json'));
    actions.appendChild(csvBtn);
    actions.appendChild(jsonBtn);
    header.appendChild(actions);

    listEl = document.createElement('ul');
    listEl.className = 'ds-list';

    panelEl.appendChild(header);
    panelEl.appendChild(listEl);

    toggleEl.addEventListener('click', () => {
        const open = panelEl!.hidden;
        panelEl!.hidden = !open;
        toggleEl!.setAttribute('aria-expanded', String(open));
        if (open) render();
    });

    document.body.appendChild(toggleEl);
    document.body.appendChild(panelEl);
}

export function initDataStatusPanel(): void {
    if (typeof document === 'undefined') return;
    createDom();
    render();
    refreshTimer = setInterval(() => {
        if (panelEl && !panelEl.hidden) render();
    }, 10_000);
    subscribe(() => {
        if (!toggleEl || !panelEl) return;
        toggleEl.textContent = t('data.sourceStatus');
        panelEl.setAttribute('aria-label', t('data.sourceStatus'));
        const h2 = panelEl.querySelector('h2');
        if (h2) h2.textContent = t('data.sourceStatus');
        render();
    });
}

export function disposeDataStatusPanel(): void {
    if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
    toggleEl?.remove();
    panelEl?.remove();
    toggleEl = null;
    panelEl = null;
    listEl = null;
    summaryEl = null;
}

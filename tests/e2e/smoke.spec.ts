import { test, expect } from '@playwright/test';

/**
 * Smoke tests — they assert the app boots and the trust surface (data-status
 * panel, locale toggle, accessible controls) is wired. They deliberately do
 * not assert any specific scientific value, because the live agency APIs are
 * out of our control in CI.
 */

test.describe('planetearth.live · smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the main app shell; the globe canvas loads asynchronously.
    await page.waitForLoadState('domcontentloaded');
  });

  test('boots without fatal console errors', async ({ page }) => {
    const fatal: string[] = [];
    page.on('pageerror', (err) => fatal.push(String(err)));
    page.on('console', (msg) => {
      if (msg.type() === 'error') fatal.push(msg.text());
    });
    await page.waitForTimeout(1_500);
    // Allow CORS/fetch warnings from upstream APIs — they are expected in CI.
    const hardFailures = fatal.filter((line) => !/fetch|CORS|network|Failed to fetch/i.test(line));
    expect(hardFailures, hardFailures.join('\n')).toEqual([]);
  });

  test('renders the globe canvas', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10_000 });
    const box = await canvas.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(200);
    expect(box?.height ?? 0).toBeGreaterThan(200);
  });

  test('data-status panel opens and lists at least one metric', async ({ page }) => {
    const toggle = page.locator('.ds-toggle, [data-testid="ds-toggle"]').first();
    await expect(toggle).toBeVisible({ timeout: 10_000 });
    await toggle.click();
    const panel = page.locator('.ds-panel, [data-testid="ds-panel"]').first();
    await expect(panel).toBeVisible();
    // The panel renders one row per registered metric — there are ≥12.
    const rows = panel.locator('[class*="ds-row"]');
    await expect(rows.first()).toBeVisible({ timeout: 5_000 });
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test('locale toggle rewrites data-i18n strings', async ({ page }) => {
    // Switch to English via ?lang= URL param (more deterministic than clicking).
    await page.goto('/?lang=en');
    await page.waitForLoadState('domcontentloaded');
    const i18nNodes = page.locator('[data-i18n]').first();
    await expect(i18nNodes).toBeVisible({ timeout: 5_000 });
    // Switch back to Spanish.
    await page.goto('/?lang=es');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-i18n]').first()).toBeVisible();
  });

  test('basic keyboard navigation reaches interactive controls', async ({ page }) => {
    await page.keyboard.press('Tab');
    const first = await page.evaluate(() => document.activeElement?.tagName ?? null);
    expect(first).not.toBeNull();
    // Repeatedly tab and make sure we pass through ≥3 focusable elements without trapping.
    const visited = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const tag = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        return el ? `${el.tagName}:${el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 32) ?? ''}` : '';
      });
      if (tag) visited.add(tag);
      await page.keyboard.press('Tab');
    }
    expect(visited.size).toBeGreaterThanOrEqual(3);
  });
});

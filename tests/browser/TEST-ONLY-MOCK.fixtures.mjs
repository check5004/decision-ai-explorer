import { test as base, expect } from '@playwright/test';
import { MODEL, getModel } from '../../public/model.js';

// Deliberately synthetic, non-working credential. No environment key is read.
export const TEST_ONLY_MOCK_KEY = 'sk-or-v1-TEST_ONLY_MOCK_NOT_A_REAL_KEY';
const fixtureEnvelope = answers => ({
  id: 'TEST-ONLY-MOCK-synthetic-browser-fixture',
  provider: 'TEST-ONLY-MOCK-no-live-inference',
  model: MODEL.id,
  answers,
  usage: { input_tokens: 100, output_tokens: 0, cost: 0 },
});
export const choiceResponse = (choice = 'technical_support', probabilities = {
  technical_support: 0.8, billing_support: 0.15, product_guidance: 0.05,
}) => fixtureEnvelope({ team: { type: 'choice', choice, probabilities, confidence: 0.7 } });
export const scoreResponse = () => fixtureEnvelope({
  replenishment_priority: {
    type: 'score', score: 2.55,
    probabilities: { 0: 0.05, 1: 0.05, 2: 0.2, 3: 0.7 },
    confidence: 0.6,
  },
});
export const noulResponse = () => fixtureEnvelope({ ready_for_review: { type: 'noul', noul: 0.72 } });
export const rateLimitResponse = () => ({
  error: { code: 429, message: 'TEST-ONLY-MOCK synthetic rate-limit error; no live request occurred.' },
});

export const test = base.extend({
  // Auto fixture installs the deny-by-default network boundary before page use.
  mockNetwork: [async ({ context, baseURL }, use) => {
    const localOrigin = new URL(baseURL).origin;
    const queued = [];
    const pendingReleases = [];
    const requests = [];
    const violations = [];
    await context.routeWebSocket('**/*', socket => {
      violations.push(`Blocked WebSocket: ${socket.url()}`);
      socket.close();
    });
    await context.route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin === localOrigin) return route.continue();
      if (url.href !== MODEL.endpoint) {
        violations.push(`Blocked unexpected external request: ${url.origin}${url.pathname}`);
        return route.abort('blockedbyclient');
      }
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: {
          'access-control-allow-origin': localOrigin,
          'access-control-allow-methods': 'POST',
          'access-control-allow-headers': 'authorization,content-type',
        } });
      }
      if (request.method() !== 'POST' || request.headers().authorization !== `Bearer ${TEST_ONLY_MOCK_KEY}`) {
        violations.push('Blocked API request without the expected synthetic credential and POST method.');
        return route.abort('blockedbyclient');
      }
      const body = request.postDataJSON();
      if (!getModel(body.model)) { violations.push('Unregistered model request.'); return route.abort('blockedbyclient'); }
      const responseIndex = queued.findIndex(item => item.requestModel === body.model);
      const response = responseIndex < 0 ? null : queued.splice(responseIndex, 1)[0];
      if (!response) {
        violations.push('Blocked API request without a queued TEST-ONLY-MOCK response.');
        return route.abort('blockedbyclient');
      }
      requests.push(body);
      await response.gate;
      return route.fulfill({
        status: response.status,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': localOrigin, 'x-test-only-mock': 'synthetic-fixture' },
        body: JSON.stringify(response.body),
      });
    });
    const api = {
      requests,
      queue(body, { status = 200, hold = false, requestModel = MODEL.id } = {}) {
        let release = () => {};
        const gate = hold ? new Promise(resolve => { release = resolve; }) : Promise.resolve();
        pendingReleases.push(release);
        queued.push({ body, status, gate, requestModel });
        return release;
      },
    };
    await use(api);
    for (const release of pendingReleases) release();
    expect(violations, 'All external requests must be intercepted; live API traffic is forbidden.').toEqual([]);
  }, { auto: true }],
});
export { expect };

export async function openApp(page) {
  // Screenshot watermark exists only in the isolated test DOM, including reloads.
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const banner = document.createElement('aside');
      banner.textContent = 'TEST-ONLY-MOCK · 合成テスト応答 · No live inference';
      banner.setAttribute('data-test-only-mock', '');
      Object.assign(banner.style, {
        position: 'fixed', bottom: '0', left: '0', right: '0', zIndex: '2147483647',
        padding: '8px 12px', backgroundColor: '#7f1d1d', color: '#ffffff',
        fontFamily: 'sans-serif', fontSize: '13px', textAlign: 'center', pointerEvents: 'none',
      });
      document.body.append(banner);
    }, { once: true });
  });
  await page.goto('/');
}

export async function connectMockKey(page) {
  await page.locator('#open-connection').click();
  await page.locator('#api-key').fill(TEST_ONLY_MOCK_KEY);
  await page.locator('#consent').check();
  await page.locator('#connection-form button[type="submit"]').click();
  await expect(page.locator('#connection-dialog')).not.toBeVisible();
  await expect(page.locator('#api-key')).toHaveValue('');
}

export async function saveMockScreenshot(page, testInfo, state) {
  const filename = `TEST-ONLY-MOCK-${state}.png`;
  const path = testInfo.outputPath(filename);
  await page.screenshot({ path, fullPage: true });
  await testInfo.attach(filename, { path, contentType: 'image/png' });
}

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus && !page.isClosed()) {
    await saveMockScreenshot(page, testInfo, 'failure');
  }
});

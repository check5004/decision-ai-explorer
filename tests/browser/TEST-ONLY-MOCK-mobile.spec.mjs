import { MODELS } from '../../public/model.js';
import {
  test, expect, openApp, connectMockKey, saveMockScreenshot, choiceResponse,
} from './TEST-ONLY-MOCK.fixtures.mjs';

async function expectNoHorizontalOverflow(page) {
  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
    tableRight: document.querySelector('.result-table').getBoundingClientRect().right,
    tableLeft: document.querySelector('.result-table').getBoundingClientRect().left,
  }));
  expect(widths.page).toBeLessThanOrEqual(widths.viewport + 1);
  expect(widths.tableRight).toBeLessThanOrEqual(widths.viewport);
  expect(widths.tableLeft).toBeGreaterThanOrEqual(0);
}

test('TEST-ONLY-MOCK mobile entry keeps Japanese fields and candidate table inside the viewport', async ({ page, mockNetwork }, testInfo) => {
  await openApp(page);
  await expect(page.locator('#example-grid > button')).toHaveCount(6);
  await expect(page.getByRole('textbox', { name: '問い合わせ内容', exact: true })).toBeVisible();
  await expect(page.locator('.result-table [data-option-key]')).toHaveCount(3);
  await expect(page.locator('#output-content')).not.toContainText(/\d(?:\.\d+)?\s*%/);
  await expect(page.locator('#run-button')).toBeDisabled();
  await expectNoHorizontalOverflow(page);
  expect(mockNetwork.requests).toHaveLength(0);
  await saveMockScreenshot(page, testInfo, 'mobile-initial-no-key');
});

test('TEST-ONLY-MOCK mobile choice result remains readable without horizontal scrolling', async ({ page, mockNetwork }, testInfo) => {
  await openApp(page);
  mockNetwork.queue(choiceResponse());
  await connectMockKey(page);
  await page.locator('#run-button').click();
  await expect(page.locator('#output-content')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('.selected-result-row')).toHaveCount(1);
  await expect(page.locator('.selected-result-row .option-label')).toHaveText('技術サポート');
  await expect(page.locator('.selected-result-row .result-percent')).toHaveText('80.0%');
  await expectNoHorizontalOverflow(page);
  expect(mockNetwork.requests).toHaveLength(1);
  await saveMockScreenshot(page, testInfo, 'mobile-choice-response');
});

test('TEST-ONLY-MOCK mobile saved-key dialog stays within the viewport and keeps the key masked', async ({ page, mockNetwork }, testInfo) => {
  await openApp(page);
  await connectMockKey(page);
  await page.reload();
  await expect(page.locator('#run-button')).toBeEnabled();
  await page.locator('#open-connection').click();
  await expect(page.locator('#api-key')).toHaveAttribute('type', 'password');
  await expect(page.locator('#api-key')).toHaveValue('');
  await expect(page.locator('#key-storage-status')).toContainText('保存済み');
  const dialog = await page.locator('#connection-dialog').boundingBox();
  const viewport = page.viewportSize();
  expect(dialog.x).toBeGreaterThanOrEqual(0);
  expect(dialog.x + dialog.width).toBeLessThanOrEqual(viewport.width + 1);
  await expect(page.locator('#remove-key')).toBeVisible();
  await saveMockScreenshot(page, testInfo, 'mobile-saved-key-dialog');
  await page.locator('#remove-key').click();
  await expect(page.locator('#run-button')).toBeDisabled();
  expect(mockNetwork.requests).toHaveLength(0);
});

test('TEST-ONLY-MOCK mobile comparison stacks all models vertically without page overflow', async ({ page, mockNetwork }, testInfo) => {
  await openApp(page);
  for (const model of MODELS) { const body = choiceResponse(); body.model = model.canonicalId; mockNetwork.queue(body, { requestModel: model.id }); }
  await connectMockKey(page); await page.locator('#compare-button').click();
  await expect(page.locator('#output-content')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('.model-result')).toHaveCount(5);
  const layout = await page.locator('.model-result').evaluateAll(nodes => nodes.map(node => ({ x: node.getBoundingClientRect().x, y: node.getBoundingClientRect().y, right: node.getBoundingClientRect().right })));
  for (let index = 1; index < layout.length; index++) {
    expect(Math.abs(layout[index].x - layout[0].x)).toBeLessThan(2);
    expect(layout[index].y).toBeGreaterThan(layout[index - 1].y);
  }
  await expectNoHorizontalOverflow(page);
  expect(mockNetwork.requests).toHaveLength(5);
  await saveMockScreenshot(page, testInfo, 'five-model-comparison-mobile');
});

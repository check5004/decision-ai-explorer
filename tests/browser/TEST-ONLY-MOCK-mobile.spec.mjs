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

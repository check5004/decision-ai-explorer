import { EXAMPLES } from '../../public/examples.js';
import { PRESENTATION } from '../../public/presentation.js';
import {
  test, expect, openApp, connectMockKey, saveMockScreenshot,
  choiceResponse, scoreResponse, noulResponse, rateLimitResponse,
} from './TEST-ONLY-MOCK.fixtures.mjs';

const row = (page, key) => page.locator(`.result-table [data-option-key="${key}"]`);
const resultRows = page => page.locator('.result-table [data-option-key]');
const output = page => page.locator('#output-content');
const selectTopic = (page, id) => page.locator('#example-grid').getByRole('button', { name: PRESENTATION[id].title, exact: false }).click();
async function runFixture(page, mockNetwork, body, options) {
  mockNetwork.queue(body, options); // Must be queued before enabling/clicking Run.
  await connectMockKey(page);
  await page.locator('#run-button').click();
  await expect(output(page)).toHaveAttribute('aria-busy', 'false');
}
async function expectPercent(page, key, expected) {
  await expect(row(page, key).locator('.result-percent')).toHaveText(expected);
  const bar = row(page, key).locator('meter, .result-bar');
  await expect(bar).toHaveCount(1);
  await expect(bar).toBeVisible();
}

test('TEST-ONLY-MOCK no-key entry has Japanese candidates, topic cards, and ordinary input fields', async ({ page, mockNetwork }, testInfo) => {
  await openApp(page);
  await expect(page.locator('#run-button')).toBeDisabled();
  await expect(page.locator('#live-status')).toContainText('未実行');
  await expect(page.locator('#example-grid > button')).toHaveCount(6);
  await expect(page.locator('#example-grid table')).toHaveCount(0);
  await expect(page.locator('#example-grid h3')).toHaveText(Object.values(PRESENTATION).map(item => item.title));
  await expect(page.getByRole('textbox', { name: '問い合わせ内容', exact: true })).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: '現在のメンバー数', exact: true })).toHaveValue('3');
  await expect(page.locator('#advanced-settings')).not.toHaveAttribute('open', '');
  await expect(page.locator('#state-editor')).not.toBeVisible();
  await expect(resultRows(page)).toHaveCount(3);
  for (const [key, label] of Object.entries({ technical_support: '技術サポート', billing_support: '請求サポート', product_guidance: '使い方の案内' })) {
    await expect(row(page, key)).toContainText(label);
  }
  await expect(output(page)).not.toContainText(/\d(?:\.\d+)?\s*%/);
  await expect(page.locator('.selected-result-row')).toHaveCount(0);
  await expect(page.locator('#session-count')).toHaveText('0');
  expect(mockNetwork.requests).toHaveLength(0);
  await saveMockScreenshot(page, testInfo, 'initial-no-key');
});

test('TEST-ONLY-MOCK every topic previews all Japanese options without invented percentages', async ({ page, mockNetwork }) => {
  await openApp(page);
  for (const example of EXAMPLES) {
    await selectTopic(page, example.id);
    const criteria = Object.values(example.questions)[0].criteria;
    await expect(resultRows(page)).toHaveCount(Object.keys(criteria).length);
    for (const candidate of await resultRows(page).all()) {
      await expect(candidate).toContainText(/[ぁ-んァ-ヶ一-龠]/);
    }
    await expect(page.locator('#friendly-fields input, #friendly-fields textarea, #friendly-fields select').first()).toBeVisible();
    await expect(output(page)).not.toContainText(/\d(?:\.\d+)?\s*%/);
    await expect(page.locator('.selected-result-row')).toHaveCount(0);
    await expect(page.locator('#run-button')).toBeDisabled();
  }
  expect(mockNetwork.requests).toHaveLength(0);
});

test('TEST-ONLY-MOCK friendly input stays synchronized with advanced JSON', async ({ page, mockNetwork }) => {
  await openApp(page);
  await page.getByRole('textbox', { name: '問い合わせ内容', exact: true }).fill('TEST-ONLY-MOCK：請求内容を確認したいです。');
  await page.getByRole('spinbutton', { name: '現在のメンバー数', exact: true }).fill('7');
  await page.locator('#advanced-settings > summary').click();
  await expect(page.locator('#state-editor')).toBeVisible();
  const state = JSON.parse(await page.locator('#state-editor').inputValue());
  expect(state.customer_message).toBe('TEST-ONLY-MOCK：請求内容を確認したいです。');
  expect(state.members).toBe(7);
  await page.locator('#questions-tab').click();
  await expect(page.locator('#questions-editor')).toBeVisible();
  expect(JSON.parse(await page.locator('#questions-editor').inputValue()).team.type).toBe('choice');
  await page.locator('#state-tab').click();
  state.members = 9;
  await page.locator('#state-editor').fill(JSON.stringify(state, null, 2));
  await expect(page.getByRole('spinbutton', { name: '現在のメンバー数', exact: true })).toHaveValue('9');
  await expect(page.locator('#run-button')).toBeDisabled();
  expect(mockNetwork.requests).toHaveLength(0);
});

test('TEST-ONLY-MOCK choice response highlights the selected Japanese row and exact percentages', async ({ page, mockNetwork }, testInfo) => {
  await openApp(page);
  await runFixture(page, mockNetwork, choiceResponse());
  await expect(page.locator('#live-status')).toHaveText('実APIの結果');
  await expect(resultRows(page)).toHaveCount(3);
  await expect(page.locator('.selected-result-row')).toHaveCount(1);
  await expect(row(page, 'technical_support')).toHaveClass(/selected-result-row/);
  await expect(row(page, 'technical_support')).toContainText('技術サポート');
  await expectPercent(page, 'technical_support', '80.0%');
  await expectPercent(page, 'billing_support', '15.0%');
  await expectPercent(page, 'product_guidance', '5.0%');
  await expect(page.locator('#session-count')).toHaveText('1');
  await expect(page.locator('#session-successes')).toHaveText('1');
  expect(mockNetwork.requests).toHaveLength(1);
  await saveMockScreenshot(page, testInfo, 'choice-response');
});

test('TEST-ONLY-MOCK score keeps the continuous value separate from four probability rows', async ({ page, mockNetwork }, testInfo) => {
  await openApp(page);
  await selectTopic(page, 'inventory');
  await expect(page.getByRole('spinbutton', { name: '現在の在庫数', exact: true })).toHaveValue('18');
  await expect(resultRows(page)).toHaveCount(4);
  await expect(output(page)).not.toContainText(/\d(?:\.\d+)?\s*%/);
  await runFixture(page, mockNetwork, scoreResponse());
  await expect(output(page)).toContainText('2.55');
  await expect(output(page)).toContainText(/スコア|評価値/);
  await expect(resultRows(page)).toHaveCount(4);
  await expectPercent(page, '0', '5.0%');
  await expectPercent(page, '1', '5.0%');
  await expectPercent(page, '2', '20.0%');
  await expectPercent(page, '3', '70.0%');
  await expect(row(page, '3')).toContainText('すぐに担当者が確認');
  await expect(page.locator('.selected-result-row')).toHaveCount(0);
  expect(mockNetwork.requests).toHaveLength(1);
  await saveMockScreenshot(page, testInfo, 'continuous-score-response');
});

test('TEST-ONLY-MOCK noul explains true degree and derived false without a chosen class', async ({ page, mockNetwork }, testInfo) => {
  await openApp(page);
  await selectTopic(page, 'release');
  await expect(resultRows(page)).toHaveCount(2);
  await runFixture(page, mockNetwork, noulResponse());
  await expect(output(page)).toContainText(/度合い/);
  await expect(page.locator('.result-summary-noul strong')).toHaveText('72.0%');
  await expect(row(page, 'true')).toContainText('レビューに進む準備ができている');
  await expect(row(page, 'false')).toContainText('不足・失敗・未確認事項がある');
  await expectPercent(page, 'true', '72.0%');
  await expectPercent(page, 'false', '28.0%');
  await expect(output(page)).toContainText(/100%\s*[−-]\s*返却値/);
  await expect(page.locator('.selected-result-row')).toHaveCount(0);
  expect(mockNetwork.requests).toHaveLength(1);
  await saveMockScreenshot(page, testInfo, 'noul-degree-response');
});

test('TEST-ONLY-MOCK edits mark stale results, rerun clears them while waiting, and key removal disables runs', async ({ page, mockNetwork }) => {
  await openApp(page);
  await runFixture(page, mockNetwork, choiceResponse());
  await page.getByRole('spinbutton', { name: '現在のメンバー数', exact: true }).fill('8');
  await expect(output(page).locator('.result-stale')).toContainText('前回');
  await expect(row(page, 'technical_support')).toHaveClass(/selected-result-row/);
  const release = mockNetwork.queue(choiceResponse('billing_support', {
    technical_support: 0.3, billing_support: 0.6, product_guidance: 0.1,
  }), { hold: true });
  await expect(page.locator('#run-button')).toBeEnabled();
  await page.locator('#run-button').click();
  await expect.poll(() => mockNetwork.requests.length).toBe(2);
  await expect(output(page)).toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('#run-button')).toBeDisabled();
  await expect(page.locator('#friendly-fields input, #friendly-fields textarea, #friendly-fields select').first()).toBeDisabled();
  await expect(page.locator('.selected-result-row')).toHaveCount(0);
  await expect(output(page)).not.toContainText('80.0%');
  release();
  await expect(output(page)).toHaveAttribute('aria-busy', 'false');
  await expect(row(page, 'billing_support')).toHaveClass(/selected-result-row/);
  await expectPercent(page, 'billing_support', '60.0%');
  await expect(output(page).locator('.result-stale')).toHaveCount(0);
  await expect(page.locator('#session-count')).toHaveText('2');
  await expect(page.locator('#session-successes')).toHaveText('2');
  expect(mockNetwork.requests[1].state.members).toBe(8);
  await page.locator('#open-connection').click();
  await page.locator('#remove-key').click();
  await expect(page.locator('#run-button')).toBeDisabled();
  await expect(page.locator('#api-key')).toHaveValue('');
  await expect(page.locator('#connection-label')).toContainText('APIキー');
  await expect(page.locator('#session-count')).toHaveText('2');
  expect(mockNetwork.requests).toHaveLength(2);
  await page.reload();
  await expect(page.locator('#run-button')).toBeDisabled();
  await expect(page.locator('#session-count')).toHaveText('0');
  await expect(page.locator('.selected-result-row')).toHaveCount(0);
  await expect(output(page)).not.toContainText(/\d(?:\.\d+)?\s*%/);
  expect(mockNetwork.requests).toHaveLength(2);
});

test('TEST-ONLY-MOCK failed rerun shows an error without cached or invented success and never retries', async ({ page, mockNetwork }, testInfo) => {
  await openApp(page);
  await runFixture(page, mockNetwork, choiceResponse());
  mockNetwork.queue(rateLimitResponse(), { status: 429 });
  await expect(page.locator('#run-button')).toBeEnabled();
  await page.locator('#run-button').click();
  await expect(page.locator('#live-status')).toHaveText('取得に失敗');
  await expect(output(page)).toContainText('HTTP 429');
  await expect(output(page)).not.toContainText('80.0%');
  await expect(page.locator('.selected-result-row')).toHaveCount(0);
  await expect(output(page)).not.toContainText(/\d(?:\.\d+)?\s*%/);
  await expect(page.locator('#session-count')).toHaveText('2');
  await expect(page.locator('#session-successes')).toHaveText('1');
  await expect(page.locator('#run-button')).toBeEnabled();
  expect(mockNetwork.requests).toHaveLength(2);
  await saveMockScreenshot(page, testInfo, 'error-without-result');
});


test('TEST-ONLY-MOCK keyboard topic selection moves focus to the chosen workspace', async ({ page, mockNetwork }) => {
  await openApp(page);
  const topic = page.locator('#example-grid').getByRole('button', { name: PRESENTATION.tools.title, exact: false });
  await topic.focus();
  await topic.press('Enter');
  await expect(page.locator('#workspace-title')).toHaveText(PRESENTATION.tools.title);
  await expect(page.locator('#workspace-title')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#reset-example')).toBeFocused();
  expect(mockNetwork.requests).toHaveLength(0);
});

test('TEST-ONLY-MOCK every question displays its own result including a later continuous score', async ({ page, mockNetwork }) => {
  await openApp(page);
  await page.locator('#advanced-settings > summary').click();
  await page.locator('#questions-tab').click();
  const questions = { ...EXAMPLES[0].questions, secondary_score: EXAMPLES.find(x => x.id === 'inventory').questions.replenishment_priority };
  await page.locator('#questions-editor').fill(JSON.stringify(questions));
  const body = choiceResponse();
  body.answers.secondary_score = scoreResponse().answers.replenishment_priority;
  await runFixture(page, mockNetwork, body);
  await expect(page.locator('.result-question')).toHaveCount(2);
  await expect(page.locator('.result-summary-choice strong')).toHaveText('技術サポート');
  await expect(page.locator('.result-summary-score strong')).toHaveText('2.55 / 3');
  await expect(page.locator('.result-question').nth(1).locator('[data-option-key]')).toHaveCount(4);
  expect(mockNetwork.requests).toHaveLength(1);
});

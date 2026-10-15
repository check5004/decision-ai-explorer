import test from 'node:test';
import assert from 'node:assert/strict';
import { EXAMPLES } from '../public/examples.js';
import { MODEL, LIMITS } from '../public/model.js';
import { buildRequest, validateResponse, requestDecision, probabilityRows, answerSummary, summarizeRuns, redactSecret, DecisionError, inspectModelIdentity } from '../public/core.js';
const request = () => buildRequest(JSON.stringify(EXAMPLES[0].state), JSON.stringify(EXAMPLES[0].questions));
const response = () => ({ id: 'test-fixture-not-a-live-run', model: MODEL.id, provider: 'test-fixture', answers: { team: { type: 'choice', choice: 'technical_support', probabilities: { technical_support: .8, billing_support: .15, product_guidance: .05 }, confidence: .7 } }, usage: { input_tokens: 321, output_tokens: 0, cost: .000013482 } });

test('all six fictional presets are valid requests to the exact model', () => { for (const x of EXAMPLES) assert.equal(buildRequest(JSON.stringify(x.state), JSON.stringify(x.questions)).model, MODEL.id); });
test('invalid JSON, non-object state, and unsupported question shapes are rejected', () => {
  assert.throws(() => buildRequest('{', '{}'), /JSON/); assert.throws(() => buildRequest('[]', '{}'), /オブジェクト/);
  assert.throws(() => buildRequest('{}', '{}'), /質問/);
  assert.throws(() => buildRequest('{}', '{"q":{"type":"chat","instructions":"x","criteria":{}}}'), /type/);
  assert.throws(() => buildRequest('{}', '{"q":{"type":"noul","instructions":"x","criteria":{"a":"a","b":"b"}}}'), /true/);
  assert.throws(() => buildRequest('{}', '{"q":{"type":"score","instructions":"x","criteria":["a"]}}'), /score/);
  assert.throws(() => buildRequest('{}', '{"q":{"type":"choice","instructions":"x","criteria":{"a":"a","b":"b"},"model":"other"}}'), /未対応/);
});
test('payload byte limit and question count are enforced before networking', () => {
  assert.throws(() => buildRequest(JSON.stringify({ huge: 'あ'.repeat(LIMITS.maxPayloadBytes) }), JSON.stringify(EXAMPLES[0].questions)), /大きすぎ/);
  assert.throws(() => buildRequest('{}', JSON.stringify(Object.fromEntries(Array.from({ length: 7 }, (_, i) => [`q${i}`, EXAMPLES[0].questions.team])))), /質問/);
});
test('real response validation accepts choice, noul and score shapes', () => {
  assert.equal(validateResponse(response(), request()).answers.team.choice, 'technical_support');
  for (const [example, answer] of [[EXAMPLES[1], { type: 'noul', noul: .1 }], [EXAMPLES[2], { type: 'score', score: 2.5, probabilities: { 0: .05, 1: .05, 2: .25, 3: .65 }, confidence: .5 }]]) {
    const req = buildRequest(JSON.stringify(example.state), JSON.stringify(example.questions));
    validateResponse({ model: MODEL.id, answers: { [Object.keys(req.questions)[0]]: answer } }, req);
  }
});
test('malformed responses, alternate model, hallucinated option and bad probabilities are rejected', () => {
  assert.throws(() => validateResponse({}, request()), /answers/);
  assert.throws(() => validateResponse({ ...response(), model: '' }, request()), /モデル/);
  const invalid = response(); invalid.answers.team.choice = 'unknown'; assert.throws(() => validateResponse(invalid, request()), /未定義/);
  const invalid2 = response(); invalid2.answers.team.probabilities.technical_support = 8; assert.throws(() => validateResponse(invalid2, request()), /確率/);
  const invalid3 = response(); invalid3.answers.team.probabilities = [.8, .15, .05]; assert.throws(() => validateResponse(invalid3, request()), /オブジェクト/);
});
test('request uses fixed endpoint, no credentials/cookies/redirects, and returns actual measured timings', async () => {
  let seen; let tick = 100;
  const out = await requestDecision({ request: request(), key: 'unit-test-key', now: () => { tick += 10; return tick; }, fetchImpl: async (url, options) => { seen = { url, options }; return new Response(JSON.stringify(response()), { status: 200 }); } });
  assert.equal(seen.url, MODEL.endpoint); assert.equal(seen.options.headers.Authorization, 'Bearer unit-test-key'); assert.equal(seen.options.credentials, 'omit'); assert.equal(seen.options.redirect, 'error'); assert.equal(seen.options.referrerPolicy, 'no-referrer');
  assert.equal(JSON.parse(seen.options.body).model, MODEL.id); assert.equal(out.timing.headersMs, 10); assert.equal(out.timing.totalMs, 20); assert.equal(out.data.id, 'test-fixture-not-a-live-run');
});
test('HTTP errors are displayed and secret echoes are redacted, with no automatic retries', async () => {
  let calls = 0;
  await assert.rejects(requestDecision({ request: request(), key: 'test-key-secret', fetchImpl: async () => { calls++; return new Response('{"error":"test-key-secret invalid"}', { status: 401 }); } }), error => { assert(error instanceof DecisionError); assert.equal(error.status, 401); assert.equal(error.body.error, '[REDACTED] invalid'); return true; });
  assert.equal(calls, 1);
});
test('non-JSON, network failures, schema mismatch and cancellation surface honestly', async () => {
  await assert.rejects(requestDecision({ request: request(), key: '', fetchImpl: async () => new Response('<html>bad gateway</html>', { status: 502 }) }), /JSON以外/);
  await assert.rejects(requestDecision({ request: request(), key: '', fetchImpl: async () => { throw new TypeError('Failed to fetch'); } }), /通信に失敗/);
  await assert.rejects(requestDecision({ request: request(), key: '', fetchImpl: async () => new Response(JSON.stringify({ model: MODEL.id, answers: {} })) }), /要求していない/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(requestDecision({ request: request(), key: '', signal: controller.signal, fetchImpl: async () => { throw new Error('aborted'); } }), /料金が発生/);
});
test('oversized response is bounded and cancelled', async () => {
  await assert.rejects(requestDecision({ request: request(), key: '', fetchImpl: async () => new Response('x'.repeat(LIMITS.maxResponseBytes + 1)) }), /通信に失敗/);
});
test('probability rendering, summaries and aggregate costs use real values only', () => {
  const answer = response().answers.team;
  assert.equal(probabilityRows(answer, EXAMPLES[0].questions.team)[0].value, .8);
  assert.equal(answerSummary(answer), 'technical_support');
  assert.deepEqual(summarizeRuns([]), { attempts: 0, successes: 0, unverifiedModels: 0, medianMs: null, reportedCost: 0, missingCosts: 0 });
  const summary = summarizeRuns([{ result: { data: response(), timing: { totalMs: 300 } } }, { result: { data: response(), timing: { totalMs: 100 } } }, { error: { body: {} } }]);
  assert.equal(summary.medianMs, 200); assert.equal(summary.successes, 2); assert.equal(summary.missingCosts, 1); assert.equal(summary.reportedCost, 2 * response().usage.cost);
});
test('secrets redact recursively, including object keys', () => { assert.deepEqual(redactSecret({ secret: ['a secret b', { x: 'secret' }] }, 'secret'), { '[REDACTED]': ['a [REDACTED] b', { x: '[REDACTED]' }] }); });

test('unexpected answer keys and confidence fields cannot crash UI rendering', () => {
  const data = response(); data.answers = { unexpected: { type: 'bad' }, ...data.answers };
  assert.throws(() => validateResponse(data, request()), /要求していない/);
  const example = EXAMPLES[1]; const req = buildRequest(JSON.stringify(example.state), JSON.stringify(example.questions));
  for (const confidence of [null, 'high', Infinity]) assert.throws(() => validateResponse({ model: MODEL.id, answers: { ready_for_review: { type: 'noul', noul: .1, confidence } } }, req), /confidence/);
});

test('noncanonical model IDs are flagged and excluded from Decision-1 timing statistics', () => {
  for (const model of ['microsoft/microsoft-decision-10', 'microsoft/microsoft-decision-1-20261009', 'microsoft-decision-1']) {
    assert.equal(inspectModelIdentity(model).verified, false);
    const summary = summarizeRuns([{ result: { data: { ...response(), model }, timing: { totalMs: 42 } } }]);
    assert.equal(summary.unverifiedModels, 1); assert.equal(summary.medianMs, null);
  }
  assert.equal(inspectModelIdentity(MODEL.id).verified, true);
});
test('non-JSON secret redaction happens before display truncation', async () => {
  const secret = 'test-credential-do-not-publish';
  await assert.rejects(requestDecision({ request: request(), key: secret, fetchImpl: async () => new Response('x'.repeat(3990) + secret, { status: 500 }) }), error => { assert(!error.body.includes('test-cre')); assert(error.body.endsWith('[REDACTED]')); return true; });
});

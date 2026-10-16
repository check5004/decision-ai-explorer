import { MODEL, getModel, LIMITS } from './model.js';

export class DecisionError extends Error {
  constructor(message, { status = null, body = null, timing = null } = {}) { super(message); this.name = 'DecisionError'; this.status = status; this.body = body; this.timing = timing; }
}

export function parseObject(text, label) {
  let value;
  try { value = JSON.parse(text); } catch { throw new Error(`${label}のJSON構文を確認してください。`); }
  if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error(`${label}はJSONオブジェクトにしてください。`);
  return value;
}

export function buildRequest(stateText, questionsText, modelId = MODEL.id) {
  if (!getModel(modelId)) throw new Error('登録済みの判断モデルを選んでください。');
  const state = parseObject(stateText, '入力');
  const questions = parseObject(questionsText, '質問');
  const entries = Object.entries(questions);
  if (!entries.length || entries.length > LIMITS.maxQuestions) throw new Error(`質問は1〜${LIMITS.maxQuestions}個にしてください。`);
  for (const [name, question] of entries) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(name)) throw new Error('質問名は英字で始まる64文字以内の英数字・アンダースコアにしてください。');
    if (!question || typeof question !== 'object' || Array.isArray(question)) throw new Error(`${name}: 質問はオブジェクトにしてください。`);
    if (!['choice', 'noul', 'score'].includes(question.type)) throw new Error(`${name}: type は choice / noul / score を指定してください。`);
    if (typeof question.instructions !== 'string' || !question.instructions.trim()) throw new Error(`${name}: instructions を入力してください。`);
    const c = question.criteria;
    if (question.type === 'score') {
      if (!Array.isArray(c) || c.length < 2 || c.length > LIMITS.maxCriteria || c.some(x => typeof x !== 'string' || !x.trim())) throw new Error(`${name}: score の criteria は2〜${LIMITS.maxCriteria}個の説明文の配列にしてください。`);
    } else {
      if (!c || Array.isArray(c) || typeof c !== 'object' || Object.keys(c).length < 2 || Object.keys(c).length > LIMITS.maxCriteria || Object.values(c).some(x => typeof x !== 'string' || !x.trim())) throw new Error(`${name}: criteria は2〜${LIMITS.maxCriteria}個の選択肢と説明文のオブジェクトにしてください。`);
      if (question.type === 'noul' && (Object.keys(c).length !== 2 || !Object.hasOwn(c, 'true') || !Object.hasOwn(c, 'false'))) throw new Error(`${name}: noul の criteria は true / false の2つにしてください。`);
    }
    for (const key of Object.keys(question)) if (!['type', 'instructions', 'criteria'].includes(key)) throw new Error(`${name}: 未対応の質問フィールド ${key} です。`);
  }
  const request = { model: modelId, state, questions };
  const bytes = new TextEncoder().encode(JSON.stringify(request)).byteLength;
  if (bytes > LIMITS.maxPayloadBytes) throw new Error(`入力が大きすぎます。このPoCはリクエスト全体を${LIMITS.maxPayloadBytes.toLocaleString()}バイトまでに制限しています。`);
  return request;
}

export function redactSecret(value, secret) {
  if (typeof value === 'string') return secret ? value.split(secret).join('[REDACTED]') : value;
  if (Array.isArray(value)) return value.map(x => redactSecret(x, secret));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [redactSecret(k, secret), redactSecret(v, secret)]));
  return value;
}

function bounded(value, min, max) { return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max; }
export function validateResponse(data, request) {
  if (!data || typeof data !== 'object' || !data.answers || typeof data.answers !== 'object' || Array.isArray(data.answers)) throw new Error('API応答に answers がありません。生の応答を確認してください。');
  if (typeof data.model !== 'string' || !data.model.trim()) throw new Error('API応答にモデルIDがありません。');
  if (Object.keys(data.answers).length !== Object.keys(request.questions).length || Object.keys(data.answers).some(name => !Object.hasOwn(request.questions, name))) throw new Error('API応答に要求していない質問の回答が含まれています。');
  for (const [name, question] of Object.entries(request.questions)) {
    const a = data.answers[name];
    if (!a || typeof a !== 'object' || Array.isArray(a) || a.type !== question.type) throw new Error(`${name}: 応答の判断タイプが要求と一致しません。`);
    if (a.confidence !== undefined && !bounded(a.confidence, 0, 1)) throw new Error(`${name}: confidence が0〜1の範囲外です。`);
    if (a.type === 'choice') {
      if (typeof a.choice !== 'string' || !Object.hasOwn(question.criteria, a.choice)) throw new Error(`${name}: 未定義の選択肢が返りました。`);
    } else if (a.type === 'noul') {
      if (!bounded(a.noul, 0, 1)) throw new Error(`${name}: noul が0〜1の範囲外です。`);
    } else if (!bounded(a.score, 0, question.criteria.length - 1)) throw new Error(`${name}: score が評価尺度の範囲外です。`);
    if (a.type !== 'noul') {
      if (!a.probabilities || Array.isArray(a.probabilities) || typeof a.probabilities !== 'object') throw new Error(`${name}: probabilities がオブジェクトではありません。`);
      const keys = a.type === 'choice' ? Object.keys(question.criteria) : question.criteria.map((_, i) => String(i));
      if (keys.some(k => !Object.hasOwn(a.probabilities, k) || !bounded(a.probabilities[k], 0, 1)) || Object.keys(a.probabilities).some(k => !keys.includes(k))) throw new Error(`${name}: 確率分布のキーまたは値が不正です。`);
      const sum = Object.values(a.probabilities).reduce((a, b) => a + b, 0);
      if (Math.abs(sum - 1) > 0.02) throw new Error(`${name}: 確率の合計が1に近くありません。`);
    }
  }
  return data;
}

export async function requestDecision({ request, key, signal, fetchImpl = fetch, now = () => performance.now(), startedAt = null }) {
  if (!getModel(request?.model)) throw new DecisionError('登録済みの判断モデルを選んでください。');
  const started = startedAt ?? now();
  let headersMs = null;
  let response;
  try {
    response = await fetchImpl(MODEL.endpoint, {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(request), signal, credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer',
    });
    headersMs = now() - started;
    const reader = response.body?.getReader();
    let text = '';
    if (reader) {
      const decoder = new TextDecoder();
      let count = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        count += value.byteLength;
        if (count > LIMITS.maxResponseBytes) { await reader.cancel(); throw new Error('API応答がPoCのサイズ上限を超えました。'); }
        text += decoder.decode(value, { stream: true });
      }
      text += decoder.decode();
    } else text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { throw new DecisionError('APIからJSON以外の応答が返りました。', { status: response.status, body: redactSecret(text, key).slice(0, 4000) }); }
    data = redactSecret(data, key);
    const timing = { headersMs, totalMs: now() - started };
    if (!response.ok) {
      const explanation = { 400: 'リクエスト形式や入力を確認してください。', 401: 'APIキーが無効、または期限切れです。', 402: 'OpenRouterの残高またはキーの利用上限を確認してください。', 403: 'このキーではモデルへのアクセスが許可されていません。', 404: 'モデルまたはalpha APIが利用できません。', 429: 'レート制限です。時間をおいて、必要なら手動で再実行してください。', 503: 'プロバイダーが一時的に利用できません。' }[response.status] || 'OpenRouterへのリクエストが失敗しました。';
      throw new DecisionError(`HTTP ${response.status}: ${explanation}`, { status: response.status, body: data, timing });
    }
    try { validateResponse(data, request); } catch (error) { throw new DecisionError(error.message, { status: response.status, body: data, timing }); }
    return { data, timing, identity: inspectModelIdentity(data.model, request.model), receivedAt: new Date().toISOString() };
  } catch (error) {
    if (error instanceof DecisionError) { if (!error.timing) error.timing = { headersMs, totalMs: now() - started }; throw error; }
    const message = signal?.aborted ? '通信を中断しました。サーバー側で完了している場合、料金が発生する可能性があります。' : '通信に失敗しました。ネットワーク、CORS、ブラウザー拡張の制限を確認してください。自動再試行はしません。';
    throw new DecisionError(message, { timing: { headersMs, totalMs: now() - started } });
  }
}

export function inspectModelIdentity(returnedId, requestedId = MODEL.id) {
  const model = getModel(requestedId);
  const exact = !!model && returnedId === model.id;
  const canonical = !!model && returnedId === model.canonicalId;
  return {
    requested: requestedId, returned: returnedId, verified: exact || canonical,
    match: exact ? 'requested-id' : canonical ? 'documented-canonical-id' : 'unrecognized',
    evidence: canonical ? { url: model.identityReference, checkedAt: model.identityCheckedAt } : null,
  };
}

export function probabilityRows(answer, question) {
  if (answer.type === 'noul') return [{ name: 'true', label: question.criteria.true, value: answer.noul }, { name: 'false', label: question.criteria.false, value: 1 - answer.noul }];
  return Object.entries(answer.probabilities).map(([name, value]) => ({ name, value, label: Array.isArray(question.criteria) ? question.criteria[Number(name)] : question.criteria[name] })).sort((a, b) => b.value - a.value);
}

export function answerSummary(answer) {
  return answer.type === 'choice' ? answer.choice : answer.type === 'noul' ? `P(true) = ${(answer.noul * 100).toFixed(1)}%` : `score = ${answer.score.toFixed(2)}`;
}

export function summarizeRuns(allRuns, modelId = MODEL.id) {
  // Runtime records always carry the immutable request; default supports older single-model records.
  const runs = allRuns.filter(x => (x.request?.model ?? x.result?.identity?.requested ?? MODEL.id) === modelId);
  const successful = runs.filter(x => x.result);
  const identityVerified = successful.filter(x => inspectModelIdentity(x.result.data.model, modelId).verified);
  const timings = identityVerified.map(x => x.result.timing.totalMs).sort((a, b) => a - b);
  const middle = Math.floor(timings.length / 2);
  const median = timings.length ? (timings.length % 2 ? timings[middle] : (timings[middle - 1] + timings[middle]) / 2) : null;
  const costs = runs.map(x => x.result?.data?.usage?.cost ?? x.error?.body?.usage?.cost).filter(x => typeof x === 'number' && Number.isFinite(x) && x >= 0);
  return { attempts: runs.length, successes: successful.length, unverifiedModels: successful.length - identityVerified.length, medianMs: median, reportedCost: costs.reduce((a, b) => a + b, 0), missingCosts: runs.length - costs.length };
}

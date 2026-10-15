import { EXAMPLES } from './examples.js';
import { MODEL, LIMITS } from './model.js';
import { buildRequest, requestDecision, probabilityRows, answerSummary, summarizeRuns } from './core.js';

if (window.self !== window.top) {
  const message = document.createElement('p'); message.textContent = '安全のため、このページを独立したタブで開いてください。埋め込み表示ではキーを入力できません。';
  const link = document.createElement('a'); link.textContent = 'Decision Atelierを開く'; link.href = window.location.href; link.target = '_blank'; link.rel = 'noopener noreferrer';
  document.body.replaceChildren(message, link);
  throw new Error('Embedded use is disabled.');
}

const $ = id => document.getElementById(id);
const pretty = value => JSON.stringify(value, null, 2);
const el = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };
const records = new Map(EXAMPLES.map(example => [example.id, { state: pretty(example.state), questions: pretty(example.questions), result: null, error: null, request: null }]));
const history = [];
let currentId = EXAMPLES[0].id;
let apiKey = '';
let activeController = null;
let running = false;
let lastAttemptAt = -Infinity;
let sessionAttempts = 0;
let cooldownTimer;
let requestIsValid = true;

function setBadge(text, kind = 'neutral') { $('live-status').textContent = text; $('live-status').className = `badge ${kind}`; }
function showValidation(message) { $('validation-error').textContent = message || ''; $('validation-error').hidden = !message; }
function currentRecord() { return records.get(currentId); }
function currentExample() { return EXAMPLES.find(x => x.id === currentId); }
function validCost(value) { return typeof value === 'number' && Number.isFinite(value) && value >= 0; }
function formatMoney(value) { return validCost(value) ? `$${value.toFixed(8)}` : '未報告'; }
function formatMs(value) { return typeof value === 'number' ? `${Math.round(value).toLocaleString()} ms` : '—'; }

function renderGallery() {
  const grid = $('example-grid'); grid.replaceChildren();
  for (const example of EXAMPLES) {
    const card = el('button', `example-card${example.id === currentId ? ' selected' : ''}`);
    card.type = 'button'; card.disabled = running; card.setAttribute('aria-pressed', String(example.id === currentId)); card.setAttribute('aria-controls', 'workspace');
    const top = el('div', 'card-top'); top.append(el('span', 'card-icon', example.icon), el('span', 'card-category', example.category));
    const heading = el('h3', '', example.title);
    const bottom = el('div', 'card-bottom'); bottom.append(el('span', 'type-chip', example.type));
    const record = records.get(example.id);
    const summary = record.result ? record.result.identity.verified ? answerSummary(record.result.data.answers[Object.keys(record.request.questions)[0]]) : '返却モデルIDを確認' : example.label;
    bottom.append(el('span', record.result ? 'card-result' : '', summary), el('span', 'card-arrow', example.id === currentId ? '↙' : '↗'));
    card.append(top, el('span', 'card-number', example.number), heading, bottom);
    card.addEventListener('click', () => { if (running) return; currentId = example.id; renderSelected(); $('workspace').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }); });
    grid.append(card);
  }
}

function selectTab(tab) {
  for (const name of ['state', 'questions']) {
    const selected = tab === name;
    $(`${name}-tab`).setAttribute('aria-selected', String(selected));
    $(`${name}-tab`).tabIndex = selected ? 0 : -1;
    $(`${name}-editor-panel`).hidden = !selected;
  }
}

function refreshRequest({ reportError = false } = {}) {
  const record = currentRecord();
  try {
    const request = buildRequest(record.state, record.questions);
    $('request-preview').textContent = pretty(request);
    $('payload-size').textContent = `${new TextEncoder().encode(JSON.stringify(request)).byteLength.toLocaleString()} bytes / ${LIMITS.maxPayloadBytes.toLocaleString()}`;
    requestIsValid = true; showValidation('');
  } catch (error) {
    requestIsValid = false;
    $('payload-size').textContent = 'JSON / スキーマを確認';
    $('request-preview').textContent = `送信できません: ${error.message}`;
    if (reportError) showValidation(error.message);
  }
  updateControls();
}

function renderSelected() {
  const example = currentExample(); const record = currentRecord();
  $('active-title').textContent = example.short; $('active-description').textContent = example.description;
  $('active-type').textContent = example.type; $('state-editor').value = record.state; $('questions-editor').value = record.questions;
  selectTab('state'); showValidation(''); refreshRequest(); renderGallery(); renderOutput();
}

function updateControls() {
  const cooldown = Date.now() - lastAttemptAt < LIMITS.cooldownMs;
  $('run-button').disabled = !apiKey || running || !requestIsValid || cooldown || sessionAttempts >= LIMITS.maxRuns;
  $('run-label').textContent = running ? '実APIで判断中…' : sessionAttempts >= LIMITS.maxRuns ? 'このタブの20回上限に到達' : 'この入力で実行';
  $('cancel-button').hidden = !running; $('connect-inline').hidden = !!apiKey || running;
  $('connection-label').textContent = apiKey ? 'キー設定済み' : 'APIキーを設定';
  $('connection-dot').className = `status-dot${apiKey ? ' connected' : ''}`;
  $('remove-key').hidden = !apiKey; $('open-connection').disabled = running;
  $('state-editor').disabled = running; $('questions-editor').disabled = running; $('reset-example').disabled = running; $('clear-session').disabled = running;
  $('export-button').disabled = running || !(currentRecord().result || currentRecord().error);
  $('output-content').setAttribute('aria-busy', String(running));
}

function renderEmpty(busy = false) {
  const block = el('div', `output-empty${busy ? ' busy' : ''}`);
  if (busy) block.append(el('div', 'spinner'));
  else block.append(el('div', 'empty-symbol', '↗'));
  block.append(el('h4', '', busy ? '実際のモデルに、問い合わせています。' : 'ここに、実際の判断が届きます。'));
  const p = el('p', '', busy ? 'リクエストは1件です。自動再試行はしません。\n通信を含む時間を計測しています。' : '左の入力を確認し、APIキーを設定して実行。\nまだモデルを呼び出していません。'); p.style.whiteSpace = 'pre-line'; block.append(p);
  block.append(el('span', 'empty-caption', busy ? 'WAITING FOR THE REAL API RESPONSE' : 'NO PRECOMPUTED RESULTS. NO SIMULATED INFERENCE.'));
  if (!busy) block.append(el('span', 'empty-status', '判断・確率・応答時間・料金を、受信後に表示'));
  $('output-content').replaceChildren(block);
}

function makeMetrics(timing, data = null) {
  const metrics = el('div', 'metrics');
  for (const [label, value, suffix, detail] of [
    ['総応答時間', typeof timing?.totalMs === 'number' ? Math.round(timing.totalMs).toLocaleString() : '—', 'ms', '通信開始 → JSON受信'],
    ['ヘッダー到着', typeof timing?.headersMs === 'number' ? Math.round(timing.headersMs).toLocaleString() : '—', 'ms', '最初のトークンではありません'],
    ['API報告の料金', formatMoney(data?.usage?.cost), '', 'USD / このリクエスト'],
  ]) { const metric = el('div', 'metric'); const strong = el('strong', '', value); if (suffix) strong.append(el('em', '', suffix)); metric.append(el('span', '', label), strong, el('small', '', detail)); metrics.append(metric); }
  return metrics;
}

function previewFor(answer, question, example, presetQuestion) {
  const wrap = el('div', 'result-preview'); wrap.append(el('span', 'preview-label', 'PRODUCT PREVIEW / 受信した判断をUIに反映'));
  let value; let description;
  if (!presetQuestion) {
    value = answerSummary(answer); description = answer.type === 'choice' ? question.criteria[answer.choice] : '編集した判断の定義に対するAPIの返却値です。サンプル固有のUIルールは適用していません。';
  } else if (answer.type === 'choice') {
    const labels = { technical_support: '技術サポートへ', billing_support: '請求サポートへ', product_guidance: '使い方ガイドへ', search_internal_notes: '社内議事録を検索', search_public_web: 'Web検索を選択', answer_from_context: '取得済み情報で回答', ask_clarification: '確認質問を選択', keep_tone: 'トーンを維持', soften_claims: '強い断定を見直す', simplify_language: '表現を平易に', charge: '充電小屋で充電', deliver: '配達先に進む', shelter: '小屋で雨宿り', explore: '周辺を探索' };
    value = labels[answer.choice] || answer.choice; description = question.criteria[answer.choice];
  } else if (answer.type === 'noul') {
    value = answer.noul >= .8 ? 'レビュー候補へ' : answer.noul <= .2 ? '不足条件を確認' : '担当者の確認へ';
    description = 'UIルール: P(true) ≥ 80%でレビュー候補、≤ 20%で不足確認、それ以外は要確認。承認やデプロイは行いません。';
  } else {
    const max = question.criteria.length - 1;
    value = `優先度 ${answer.score.toFixed(2)} / ${max}`;
    description = 'scoreは各段階の確率で重み付けしたインデックスです。実際の補充・発注は行いません。';
  }
  const row = el('div', 'preview-value'); row.append(el('strong', '', value), el('span', '', example.icon));
  wrap.append(row, el('p', 'preview-description', description));
  return wrap;
}

function renderOutput() {
  const record = currentRecord();
  if (running) { setBadge('実APIにリクエスト中', 'busy'); renderEmpty(true); return; }
  if (!record.result && !record.error) { setBadge('未実行 · サンプル結果なし'); renderEmpty(); updateControls(); return; }
  const root = el('div', record.error ? 'error-result' : 'real-result');
  const isStale = record.sentState !== record.state || record.sentQuestions !== record.questions;
  if (isStale) root.append(el('p', 'result-stale', '表示中は前回の入力に対する応答です。現在の編集内容はまだ実行していません。'));
  if (record.error) {
    setBadge('エラー · 成功結果なし', 'error');
    root.append(el('div', 'error-icon', '!'), el('h4', '', '今回は判断を取得できませんでした。'), el('p', '', record.error.message), makeMetrics(record.error.timing, record.error.body));
    if (record.error.body !== null && record.error.body !== undefined) root.append(rawDetails('APIの生の応答', record.error.body));
  } else {
    const identityWarning = !record.result.identity.verified;
    setBadge(identityWarning ? '応答受信 · 返却モデルIDを確認' : isStale ? '前回の実API結果 · 入力変更あり' : '実APIの応答を受信', identityWarning || isStale ? 'neutral' : 'success');
    if (identityWarning) root.append(el('p', 'result-stale', `返却モデルID「${record.result.data.model}」は要求したIDと異なります。版付きIDの可能性もありますが、このPoCでは同一性を確認できていません。生の応答として表示し、上部のDecision-1応答時間の集計から除外します。`));
    const { data, timing, receivedAt } = record.result;
    const heading = el('div', 'result-heading'); heading.append(el('h4', '', '受信した判断'), el('span', '', 'REAL API RESPONSE')); root.append(heading);
    const firstEntry = Object.entries(record.request.questions)[0];
    const presetQuestion = JSON.stringify(firstEntry[1]) === JSON.stringify(currentExample().questions[firstEntry[0]]);
    root.append(previewFor(data.answers[firstEntry[0]], firstEntry[1], currentExample(), presetQuestion));
    for (const [name, question] of Object.entries(record.request.questions)) {
      const answer = data.answers[name]; const block = el('div', 'result-question');
      const heading = el('div', 'question-name', `${name} → ${answerSummary(answer)}`); heading.append(el('small', '', answer.type.toUpperCase())); block.append(heading);
      for (const row of probabilityRows(answer, question)) {
        const line = el('div', 'probability-row'); const label = el('span', 'probability-name', row.name); label.title = row.label;
        const track = el('div', 'probability-track'); const fill = el('div', 'probability-fill'); fill.style.width = `${Math.max(0, Math.min(100, row.value * 100))}%`; track.append(fill); track.setAttribute('aria-hidden', 'true');
        const pct = el('span', 'probability-value', `${(row.value * 100).toFixed(1)}%`); line.append(label, track, pct); block.append(line);
      }
      if (answer.confidence !== undefined) block.append(el('p', 'confidence-note', `confidence ${answer.confidence.toFixed(4)} は分布の集中度です。正しさの確率ではありません。`));
      else if (answer.type === 'noul') block.append(el('p', 'confidence-note', 'noulは「true」の度合いを0〜1で返します。この表示のfalseは 1 − noul です。'));
      else block.append(el('p', 'confidence-note', 'この応答ではconfidenceは報告されていません。'));
      root.append(block);
    }
    root.append(makeMetrics(timing, data));
    const provider = typeof data.provider === 'string' ? data.provider : data.provider ? JSON.stringify(data.provider) : '未報告';
    const meta = el('div', 'result-meta');
    for (const line of [`requested model: ${MODEL.id}`, `returned model: ${data.model}`, `provider: ${provider}`, `id: ${data.id ?? '未報告'}`, `tokens: input ${data.usage?.input_tokens ?? '未報告'} / output ${data.usage?.output_tokens ?? '未報告'}`, `received: ${receivedAt}`]) meta.append(el('div', '', line));
    root.append(meta, rawDetails('APIの生の応答をひらく', data), rawDetails('この結果を生成したリクエスト', record.request));
  }
  $('output-content').replaceChildren(root); updateControls();
}

function rawDetails(title, data) { const details = el('details', 'raw-details'); details.append(el('summary', '', title), el('pre', '', typeof data === 'string' ? data : pretty(data))); return details; }

function renderSession() {
  const stats = summarizeRuns(history);
  $('session-count').textContent = String(sessionAttempts); $('session-successes').textContent = String(stats.successes);
  $('session-median').textContent = formatMs(stats.medianMs);
  $('session-cost').textContent = history.length && stats.missingCosts !== history.length ? formatMoney(stats.reportedCost) : '—';
  $('hero-measurement').textContent = stats.medianMs !== null ? `${formatMs(stats.medianMs)} / n=${stats.successes - stats.unverifiedModels}` : stats.unverifiedModels ? '返却モデルIDを確認' : 'まだ未計測';
  $('cost-note').textContent = stats.missingCosts ? `料金未報告の試行が${stats.missingCosts}件あります。表示料金は合計請求額ではありません。中断・エラーでも課金される場合があります。OpenRouterの利用明細を確認してください。` : '料金は応答のusage.costの合計です。結果とキーはこのタブのメモリだけに保持し、リロードすると消えます。';
}

async function run() {
  if (running || !apiKey || sessionAttempts >= LIMITS.maxRuns || Date.now() - lastAttemptAt < LIMITS.cooldownMs) return;
  const record = currentRecord(); let request;
  try { request = buildRequest(record.state, record.questions); } catch (error) { showValidation(error.message); return; }
  running = true; sessionAttempts++; lastAttemptAt = Date.now(); showValidation('');
  const controller = new AbortController(); activeController = controller;
  const timeout = setTimeout(() => controller.abort('timeout'), LIMITS.timeoutMs);
  record.request = request; record.sentState = record.state; record.sentQuestions = record.questions; record.error = null; record.result = null;
  updateControls(); renderGallery(); renderOutput(); renderSession();
  try {
    record.result = await requestDecision({ request, key: apiKey, signal: controller.signal });
    history.push({ result: record.result });
  } catch (error) {
    record.error = { message: error.message, status: error.status ?? null, body: error.body ?? null, timing: error.timing ?? null };
    history.push({ error: record.error });
    if (error.status === 401 || error.status === 403) { apiKey = ''; $('consent').checked = false; }
  } finally {
    clearTimeout(timeout); running = false; activeController = null;
    renderOutput(); renderGallery(); renderSession(); updateControls();
    clearTimeout(cooldownTimer); cooldownTimer = setTimeout(updateControls, Math.max(0, LIMITS.cooldownMs - (Date.now() - lastAttemptAt)) + 20);
  }
}

function openConnection() {
  if (running) return;
  $('api-key').value = ''; $('connection-error').hidden = true; $('connection-dialog').showModal();
  $('api-key').focus();
}
function removeKey() { apiKey = ''; $('api-key').value = ''; $('consent').checked = false; updateControls(); }
$('connection-form').addEventListener('submit', event => {
  event.preventDefault(); const candidate = $('api-key').value.trim();
  let error = '';
  if (!/^sk-or-v1-[A-Za-z0-9_-]{16,480}$/.test(candidate)) error = 'OpenRouterのAPIキー（sk-or-v1-で始まる文字列）を入力してください。';
  else if (!$('consent').checked) error = '入力の送信先とAPI料金について確認してください。';
  if (error) { $('connection-error').textContent = error; $('connection-error').hidden = false; return; }
  apiKey = candidate; $('api-key').value = ''; $('connection-dialog').close(); updateControls();
});
$('open-connection').addEventListener('click', openConnection); $('connect-inline').addEventListener('click', openConnection);
$('close-connection').addEventListener('click', () => $('connection-dialog').close());
$('connection-dialog').addEventListener('close', () => { $('api-key').value = ''; });
$('remove-key').addEventListener('click', () => { removeKey(); $('connection-dialog').close(); });
for (const name of ['state', 'questions']) {
  $(`${name}-tab`).addEventListener('click', () => selectTab(name));
  $(`${name}-tab`).addEventListener('keydown', event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 'state' : event.key === 'End' ? 'questions' : name === 'state' ? 'questions' : 'state'; selectTab(next); $(`${next}-tab`).focus(); } });
  $(`${name}-editor`).addEventListener('input', () => { currentRecord()[name] = $(`${name}-editor`).value; refreshRequest({ reportError: true }); renderOutput(); });
}
$('run-button').addEventListener('click', run);
$('cancel-button').addEventListener('click', () => activeController?.abort('user'));
$('reset-example').addEventListener('click', () => {
  if (running) return; const example = currentExample(); const record = currentRecord(); record.state = pretty(example.state); record.questions = pretty(example.questions); renderSelected();
});
$('clear-session').addEventListener('click', () => {
  if (running) return;
  for (const record of records.values()) { record.result = null; record.error = null; record.request = null; delete record.sentState; delete record.sentQuestions; }
  history.length = 0; renderOutput(); renderGallery(); renderSession();
  $('cost-note').textContent = '結果を消去しました。通信の試行回数と20回の上限は維持します。OpenRouterの利用明細や請求は変わりません。';
});
$('export-button').addEventListener('click', () => {
  const record = currentRecord(); if (!record.result && !record.error) return;
  const report = { identity: record.result?.identity ?? null, title: 'Decision Atelier — actual API run', example: currentId, request: record.request, response: record.result?.data ?? null, timing: record.result?.timing ?? record.error?.timing ?? null, receivedAt: record.result?.receivedAt ?? null, error: record.error, measurement_note: 'Total round-trip including network, routing, provider, reading and parsing; headers are not first-token time.' };
  const url = URL.createObjectURL(new Blob([pretty(report)], { type: 'application/json' })); const link = el('a'); link.href = url; link.download = `decision-${currentId}-${Date.now()}.json`; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
window.addEventListener('pagehide', () => { activeController?.abort('pagehide'); removeKey(); });
renderSelected(); renderSession();

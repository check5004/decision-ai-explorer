import { EXAMPLES } from './examples.js';
import { PRESENTATION, getQuestionRows } from './presentation.js';
import { MODEL, MODELS, getModel, LIMITS } from './model.js';
import { KEY_STORAGE_NAME, isApiKey, readSavedKey, saveKey, deleteSavedKey } from './credentials.js';
import { buildRequest, requestDecision, summarizeRuns } from './core.js';

if (window.self !== window.top) {
  const message = document.createElement('p'); message.textContent = '安全のため、このページを独立したタブで開いてください。埋め込み表示ではキーを入力できません。';
  const link = document.createElement('a'); link.textContent = 'Decision Atelierを開く'; link.href = window.location.href; link.target = '_blank'; link.rel = 'noopener noreferrer';
  document.body.replaceChildren(message, link); throw new Error('Embedded use is disabled.');
}
const $ = id => document.getElementById(id);
const pretty = value => JSON.stringify(value, null, 2);
const el = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };
const inputs = new Map(EXAMPLES.map(example => [example.id, { state: pretty(example.state), questions: pretty(example.questions) }]));
function createRecord(exampleId) {
  const input = inputs.get(exampleId);
  return { get state() { return input.state; }, set state(value) { input.state = value; },
    get questions() { return input.questions; }, set questions(value) { input.questions = value; },
    result: null, error: null, request: null, pending: false };
}
const records = new Map(EXAMPLES.map(example => [example.id, new Map(MODELS.map(model => [model.id, createRecord(example.id)]))]));
const comparisons = new Map();
const history = [];
let currentId = EXAMPLES[0].id;
let selectedModelId = MODEL.id;
let viewMode = 'single';
let activeRunId = 0;
let apiKey = '';
let keyStorageIssue = false;
let activeController = null;
let running = false;
let lastAttemptAt = -Infinity;
let sessionAttempts = 0;
let cooldownTimer;
let requestIsValid = true;
const currentRecord = () => records.get(currentId).get(selectedModelId);
const currentModel = () => getModel(selectedModelId);
const currentExample = () => EXAMPLES.find(x => x.id === currentId);
const currentCopy = () => PRESENTATION[currentId];
function setBadge(text, kind = 'neutral') { $('live-status').textContent = text; $('live-status').className = `badge ${kind}`; }
function showValidation(message) { $('validation-error').textContent = message || ''; $('validation-error').hidden = !message; }
function formatMoney(value) { return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? `$${value.toFixed(8)}` : '未報告'; }
function formatMs(value) { return typeof value === 'number' ? `${Math.round(value).toLocaleString()} ms` : '—'; }
function typeLabel(type) { return { choice: '候補から1つ選ぶ', noul: '条件を満たす度合い', score: '段階で評価する' }[type] || '判断'; }

function renderGallery() {
  const grid = $('example-grid'); grid.replaceChildren();
  for (const example of EXAMPLES) {
    const copy = PRESENTATION[example.id]; const selected = example.id === currentId;
    const card = el('button', `example-card${selected ? ' selected' : ''}`); card.type = 'button'; card.disabled = running;
    card.setAttribute('aria-pressed', String(selected)); card.setAttribute('aria-controls', 'workspace');
    const heading = el('div', 'card-heading'); heading.append(el('span', 'card-number', example.number), el('h3', '', copy.title));
    const bottom = el('div', 'card-bottom'); bottom.append(el('span', '', typeLabel(example.type)), el('span', selected ? 'card-selected' : '', selected ? '選択中' : '選ぶ →'));
    card.append(heading, el('p', 'card-benefit', copy.benefit), bottom);
    card.addEventListener('click', () => { if (running) return; currentId = example.id; renderSelected(); $('workspace-title').focus({ preventScroll: true }); $('workspace').scrollIntoView({ behavior: 'instant', block: 'start' }); });
    grid.append(card);
  }
}

function selectTab(tab) {
  for (const name of ['state', 'questions']) { const selected = tab === name; $(`${name}-tab`).setAttribute('aria-selected', String(selected)); $(`${name}-tab`).tabIndex = selected ? 0 : -1; $(`${name}-editor-panel`).hidden = !selected; }
}

function refreshRequest({ reportError = false } = {}) {
  const record = currentRecord();
  try {
    const request = buildRequest(record.state, record.questions, selectedModelId);
    $('request-preview').textContent = pretty(request); $('payload-size').textContent = `${new TextEncoder().encode(JSON.stringify(request)).byteLength.toLocaleString()} / ${LIMITS.maxPayloadBytes.toLocaleString()} bytes`;
    requestIsValid = true; showValidation('');
  } catch (error) { requestIsValid = false; $('payload-size').textContent = 'JSON・判断基準を確認してください'; $('request-preview').textContent = `送信できません: ${error.message}`; if (reportError) showValidation(error.message); }
  updateControls();
}

function renderFriendlyFields() {
  const root = $('friendly-fields'); root.replaceChildren(); let state;
  try { state = JSON.parse(currentRecord().state); if (!state || Array.isArray(state) || typeof state !== 'object') throw new Error(); }
  catch { root.append(el('p', 'custom-fields-note', '入力JSONを解釈できません。詳細設定で修正するか、初期値に戻してください。')); return; }
  const definitions = currentCopy().fields; let custom = 0;
  for (const [key, value] of Object.entries(state)) {
    const spec = definitions[key];
    if (!spec || (value !== null && typeof value === 'object' && !(spec.control === 'lines' && Array.isArray(value) && value.every(x => typeof x === 'string')))) { custom++; continue; }
    const multiline = ['textarea', 'lines'].includes(spec.control); const field = el('div', `field${multiline ? ' full-width' : ''}`);
    const label = el('label', '', spec.label); label.htmlFor = `field-${key}`;
    let input;
    if (spec.control === 'boolean') {
      input = el('select'); for (const [v, text] of [['true', 'はい'], ['false', 'いいえ']]) { const option = el('option', '', text); option.value = v; input.append(option); } input.value = String(value);
    } else if (key === 'payment_status' && ['paid', 'unpaid', 'failed'].includes(value)) {
      input = el('select'); for (const [v, text] of [['paid', '支払い済み'], ['unpaid', '未払い'], ['failed', '支払い失敗']]) { const option = el('option', '', text); option.value = v; input.append(option); } input.value = value;
    } else {
      input = el(multiline ? 'textarea' : 'input');
      if (!multiline) input.type = spec.control === 'number' ? 'number' : 'text';
      if (spec.control === 'number') input.step = 'any';
      input.value = spec.control === 'lines' && Array.isArray(value) ? value.join('\n') : value === null ? '' : String(value);
      if (multiline) input.rows = spec.control === 'lines' ? 3 : key === 'customer_message' || key === 'draft' ? 4 : 3;
    }
    input.id = `field-${key}`; input.dataset.stateKey = key; input.autocomplete = 'off'; input.spellcheck = false; input.disabled = running;
    input.addEventListener('input', () => {
      const next = JSON.parse(currentRecord().state);
      next[key] = spec.control === 'boolean' ? input.value === 'true' : spec.control === 'number' ? input.value === '' ? null : Number(input.value) : spec.control === 'lines' ? input.value.split('\n') : input.value;
      currentRecord().state = pretty(next); $('state-editor').value = currentRecord().state; refreshRequest({ reportError: true }); renderOutput();
    });
    field.append(label, input); if (spec.hint && key !== 'payment_status') field.append(el('span', 'field-hint', spec.hint)); root.append(field);
  }
  if (custom) root.append(el('p', 'custom-fields-note', `追加・複雑な項目が${custom}件あります。値は保持しています。編集するには詳細設定を開いてください。`));
}

function renderSelected(mode = 'auto') {
  viewMode = mode === 'auto' ? comparisons.has(currentId) ? 'compare' : 'single' : mode;
  const copy = currentCopy(); const record = currentRecord();
  $('workspace-title').textContent = copy.title; $('active-benefit').textContent = copy.benefit;
  const flow = $('scenario-flow'); flow.replaceChildren();
  for (const [label, text] of [['入力するもの', copy.inputSummary], ['AIが決めること', copy.decisionSummary], ['役立つ場面', copy.actionSummary]]) { const item = el('div', 'flow-item'); item.append(el('span', '', label), el('p', '', text)); flow.append(item); }
  $('state-editor').value = record.state; $('questions-editor').value = record.questions;
  $('advanced-settings').open = false; selectTab('state'); showValidation(''); renderFriendlyFields(); refreshRequest(); renderGallery(); renderOutput();
}

function renderModelDetails() {
  const model = currentModel();
  $('model-select').value = model.id;
  $('model-info').textContent = '入力 $' + model.inputPerMillion + ' / 100万トークン・出力 $' + model.outputPerMillion + '・コンテキスト ' + model.context.toLocaleString() + 'トークン（' + model.checkedAt + '確認）';
  $('model-reference').href = model.reference;
  $('connection-model-name').textContent = model.name;
  $('connection-model-price').textContent = '入力 $' + model.inputPerMillion + ' / 100万トークン · 出力 $' + model.outputPerMillion;
  $('connection-model-reference').href = model.reference;
  $('model-footer-reference').href = model.reference;
  $('comparison-targets').textContent = MODELS.map(model => model.name).join(' / ');
}
function updateControls() {
  const cooldown = Date.now() - lastAttemptAt < LIMITS.cooldownMs;
  $('run-button').disabled = !apiKey || running || !requestIsValid || cooldown || sessionAttempts >= LIMITS.maxRuns;
  $('run-label').textContent = running ? '判断中…' : sessionAttempts >= LIMITS.maxRuns ? 'このタブの20回上限に到達' : '選択モデルだけ実行';
  $('compare-button').disabled = !apiKey || running || !requestIsValid || cooldown || sessionAttempts + MODELS.length > LIMITS.maxRuns;
  $('compare-label').textContent = running ? '判断中…' : `${MODELS.length}モデルを同時に比較`;
  $('model-select').disabled = running;
  $('view-comparison').hidden = !comparisons.has(currentId) || viewMode === 'compare';
  $('view-comparison').disabled = running;
  $('remaining-requests').textContent = `このタブの残り ${LIMITS.maxRuns - sessionAttempts}リクエスト。比較1回で${MODELS.length}件、単体実行で1件使います。`;
  $('cancel-button').hidden = !running; $('connect-inline').hidden = !!apiKey || running;
  $('connection-label').textContent = apiKey ? 'キー保存済み' : 'APIキーを設定'; $('connection-dot').className = `status-dot${apiKey ? ' connected' : ''}`;
  $('remove-key').hidden = !apiKey && !keyStorageIssue; $('open-connection').disabled = running;
  $('state-editor').disabled = running; $('questions-editor').disabled = running; $('reset-example').disabled = running; $('clear-session').disabled = running;
  for (const input of $('friendly-fields').querySelectorAll('[data-state-key]')) input.disabled = running;
  $('export-button').disabled = running || (viewMode === 'compare' ? !comparisons.get(currentId)?.entries.size : !(currentRecord().result || currentRecord().error));
  $('export-button').textContent = viewMode === 'compare' ? '比較結果を保存 ↓' : '結果を保存 ↓'; $('output-content').setAttribute('aria-busy', String(running));
}

function makeResultTable(question, rows, { answered = false } = {}) {
  const table = el('table', 'result-table');
  const caption = el('caption', 'visually-hidden', rows[0]?.questionTitle || '判断の候補と結果'); table.append(caption);
  const thead = el('thead'); const header = el('tr');
  const label = question.type === 'score' ? '評価の段階・意味' : question.type === 'noul' ? '判断の方向・意味' : '候補・意味';
  const valueLabel = question.type === 'noul' ? '当てはまる度合い' : question.type === 'score' ? '各段階の確率' : 'モデルの確率';
  for (const text of [label, valueLabel]) { const th = el('th', '', text); th.scope = 'col'; header.append(th); } thead.append(header); table.append(thead);
  const body = el('tbody');
  for (const row of rows) {
    const tr = el('tr', row.selected ? 'selected-result-row' : ''); tr.dataset.optionKey = row.key;
    const name = el('th'); name.scope = 'row'; name.append(el('span', 'option-label', row.label));
    if (row.description !== row.label) name.append(el('span', 'option-description', row.description));
    if (row.selected) name.append(el('span', 'selected-tag', '選ばれた候補'));
    const value = el('td'); const measured = answered && row.value !== null;
    value.append(el('span', `result-percent${measured ? '' : ' unmeasured'}`, measured ? `${(row.value * 100).toFixed(1)}%` : '未計測'));
    if (measured) { const bar = el('div', 'result-bar'); bar.setAttribute('aria-hidden', 'true'); const fill = el('div', 'result-bar-fill'); fill.style.width = `${row.value * 100}%`; bar.append(fill); value.append(bar); }
    tr.append(name, value); body.append(tr);
  }
  table.append(body); return table;
}

function renderQuestionResults(root, request, answers = null) {
  const allRows = getQuestionRows(currentExample(), request.questions, answers);
  let questionNumber = 0;
  for (const [name, question] of Object.entries(request.questions)) {
    questionNumber++; const rows = allRows.filter(x => x.questionId === name); const answer = answers?.[name]; const block = el('section', 'result-question');
    const title = rows[0]?.questionTitle === name ? `判断 ${questionNumber}` : rows[0]?.questionTitle || `判断 ${questionNumber}`;
    block.append(el('h4', '', title));
    if (answer) block.append(resultSummary(request, { answers }, name));
    const note = question.type === 'choice' ? '候補ごとの確率です。選ばれた候補を緑で示します。' : question.type === 'noul' ? '条件を満たす度合いです。選択肢を1つ選ぶ形式とは異なります。' : '各段階の確率です。最終スコアは、その確率で重み付けした平均になります。';
    block.append(el('p', 'question-type-note', note), makeResultTable(question, rows, { answered: !!answer }));
    if (answer) {
      if (question.type === 'noul') block.append(el('p', 'confidence-note', '条件を満たす側はAPIの返却値、反対側は「100% − 返却値」で計算しています。実際の正しさを保証する数値ではありません。'));
      else block.append(el('p', 'confidence-note', '確率はモデルが各候補に割り当てた値で、正解率ではありません。'));
    }
    root.append(block);
  }
}

function resultSummary(request, data, name) {
  const question = request.questions[name]; const answer = data.answers[name];
  const rows = getQuestionRows(currentExample(), request.questions, data.answers).filter(row => row.questionId === name);
  const wrap = el('div', `result-summary result-summary-${question.type}`);
  if (question.type === 'choice') {
    const chosen = rows.find(x => x.selected); wrap.append(el('span', '', '選ばれた候補'), el('strong', '', chosen?.label || '候補を確認してください'), el('p', '', chosen?.description || ''));
    wrap.append(el('p', 'outcome-rule', 'この候補を画面に表示しています。実際の振り分け・送信・ツール実行は行いません。'));
  } else if (question.type === 'noul') {
    wrap.append(el('span', '', '条件を満たす度合い'), el('strong', '', `${(answer.noul * 100).toFixed(1)}%`));
    const isPreset = JSON.stringify(question) === JSON.stringify(currentExample().questions[name]);
    if (isPreset) { const next = answer.noul >= .8 ? 'レビュー候補として表示' : answer.noul <= .2 ? '不足条件の確認を表示' : '担当者による確認を表示'; wrap.append(el('p', '', `このデモの表示：${next}`), el('p', 'outcome-rule', '画面側のルール：80%以上はレビュー候補、20%以下は不足確認、その間は担当者に確認。承認やデプロイは行いません。')); }
    else wrap.append(el('p', '', '編集した条件に対するモデルの返却値です。サンプル固有の判定ルールは適用していません。'));
  } else {
    wrap.append(el('span', '', '評価スコア'), el('strong', '', `${answer.score.toFixed(2)} / ${question.criteria.length - 1}`), el('p', '', '各段階の確率を重みとして計算された連続スコアです。整数の1段階を選んだ結果ではありません。'));
  }
  return wrap;
}

function makeMetrics(timing, data = null) {
  const root = el('div', 'metrics');
  for (const [label, value, unit, note] of [['応答時間', typeof timing?.totalMs === 'number' ? Math.round(timing.totalMs).toLocaleString() : '—', 'ms', '送信から受信・解析まで'], ['今回のAPI料金', formatMoney(data?.usage?.cost), '', '応答で報告されたUSD料金']]) { const metric = el('div', 'metric'); const strong = el('strong', '', value); if (unit) strong.append(el('em', '', unit)); metric.append(el('span', '', label), strong, el('small', '', note)); root.append(metric); }
  return root;
}
function rawDetails(title, data) { const details = el('details', 'raw-details'); details.append(el('summary', '', title), el('pre', '', typeof data === 'string' ? data : pretty(data))); return details; }

function renderRecord(root, record, { preview = true } = {}) {
  if ((record.result || record.error) && (record.sentState !== record.state || record.sentQuestions !== record.questions)) {
    root.append(el('p', 'result-stale', '前回の入力に対する結果です。入力変更後の条件は未実行です。'));
  }
  if (record.pending) {
    const busy = el('div', 'busy-note'); busy.append(el('span', 'spinner'), el('span', '', 'APIの応答を待っています。')); root.append(busy);
  } else if (record.error) {
    const error = el('div', 'error-result'); error.append(el('h4', '', '結果を取得できませんでした'), el('p', '', record.error.message)); root.append(error);
  } else if (!record.result) {
    const note = el('div', 'pending-note'); note.append(el('strong', '', '実行すると、ここに結果が表示されます。'), el('span', '', '下の表は候補と意味の確認用です。割合はまだ計測していません。')); root.append(note);
  }
  if (record.result) {
    const { data, timing, receivedAt, identity } = record.result;
    if (!identity.verified) root.append(el('p', 'result-stale', `返却モデルID「${data.model}」は、要求したモデルで確認済みのIDに含まれていません。速度の集計から除外しています。`));
    renderQuestionResults(root, record.request, data.answers); root.append(makeMetrics(timing, data));
    const meta = { requested_model: record.request.model, returned_model: data.model, model_identity: identity, provider: data.provider ?? '未報告', id: data.id ?? '未報告', tokens: data.usage ?? '未報告', received_at: receivedAt, response_headers_ms: timing.headersMs, timing_note: record.comparisonId ? '比較全体の共通開始時刻から受信・解析まで。ヘッダー到着は最初のトークンの時間ではありません。' : '送信開始から受信・解析まで。ヘッダー到着は最初のトークンの時間ではありません。', confidence: Object.fromEntries(Object.entries(data.answers).filter(([, a]) => a.confidence !== undefined).map(([id, a]) => [id, a.confidence])), confidence_note: 'confidenceは分布の集中度です。正解率ではありません。' };
    root.append(rawDetails('モデル・計測の詳細', meta), rawDetails('APIの生の応答（JSON）', data), rawDetails('この結果の入力・判断基準（JSON）', record.request));
  } else {
    if (preview) {
      try { renderQuestionResults(root, record.request || buildRequest(record.state, record.questions, selectedModelId)); }
      catch { root.append(el('p', 'pending-note', '入力または判断基準に問題があります。修正すると候補を表示できます。')); }
    }
    if (record.error) {
      if (record.error.timing) root.append(makeMetrics(record.error.timing, record.error.body));
      if (record.error.body != null) root.append(rawDetails('エラー応答の詳細', record.error.body));
    }
  }
}
function renderOutput() {
  const root = el('div');
  const comparison = viewMode === 'compare' ? comparisons.get(currentId) : null;
  $('workbench').dataset.mode = comparison ? 'compare' : 'single';
  $('output-title').textContent = comparison ? '3. モデルごとの結果を比べる' : `3. ${currentModel().name} の判断結果`;
  if (comparison) {
    const finished = [...comparison.entries.values()].filter(record => !record.pending).length;
    const successes = [...comparison.entries.values()].filter(record => record.result).length;
    setBadge(running ? `比較中 ${finished}/${MODELS.length}` : `比較完了・${successes}/${MODELS.length}件取得`, running ? 'busy' : successes === MODELS.length ? 'success' : 'neutral');
    root.append(el('p', 'comparison-note', '同じ入力を同時に送信しています。所要時間は共通の比較開始から受信・解析までの通信込みです。モデル単体の推論速度ではありません。'));
    const grid = el('div', 'comparison-grid');
    for (const model of MODELS) {
      const record = comparison.entries.get(model.id);
      const card = el('section', 'model-result'); card.dataset.modelId = model.id;
      const heading = el('div', 'model-result-heading'); heading.append(el('h4', '', model.name));
      heading.append(el('span', 'model-result-status', record.pending ? '判断中' : record.error ? '取得に失敗' : record.result?.identity.verified ? '実APIの結果' : 'モデルID要確認'));
      card.append(heading); renderRecord(card, record, { preview: false }); grid.append(card);
    }
    root.append(grid);
  } else {
    const record = currentRecord();
    const stale = record.result && (record.sentState !== record.state || record.sentQuestions !== record.questions);
    setBadge(record.pending ? '判断中' : record.error ? '取得に失敗' : record.result ? !record.result.identity.verified ? '結果あり・モデルID要確認' : stale ? '前回の結果・入力変更あり' : '実APIの結果' : '未実行', record.pending ? 'busy' : record.error ? 'error' : record.result?.identity.verified && !stale ? 'success' : 'neutral');
    renderRecord(root, record);
  }
  $('output-content').replaceChildren(root); updateControls();
}
function renderSession() {
  const stats = summarizeRuns(history, selectedModelId);
  $('session-count').textContent = String(sessionAttempts); $('session-successes').textContent = String(stats.successes);
  $('session-median').textContent = formatMs(stats.medianMs);
  $('session-cost').textContent = stats.attempts && stats.missingCosts !== stats.attempts ? formatMoney(stats.reportedCost) : '—';
  $('hero-measurement').textContent = stats.medianMs !== null ? `${formatMs(stats.medianMs)} / n=${stats.successes - stats.unverifiedModels}` : stats.unverifiedModels ? '返却モデルIDを確認' : '未計測';
  $('session-model-name').textContent = currentModel().name;
  $('cost-note').textContent = stats.missingCosts ? `このモデルで料金未報告の試行が${stats.missingCosts}件あります。表示料金は報告済み部分の合計です。中断・エラーでも課金される場合があります。` : '料金はこのモデルの応答で報告されたusage.costの合計です。結果と履歴はリロードで消えます。保存したキーはこのブラウザーに残ります。';
  const summary = $('model-summary-body'); summary.replaceChildren();
  for (const model of MODELS) {
    const s = summarizeRuns(history, model.id); const row = el('tr'); row.dataset.modelId = model.id;
    row.append(el('th', '', model.name), el('td', '', `${s.attempts} / ${s.successes}`), el('td', '', formatMs(s.medianMs)), el('td', '', String(s.successes - s.unverifiedModels)), el('td', '', s.attempts && s.missingCosts !== s.attempts ? formatMoney(s.reportedCost) + (s.missingCosts ? '（一部未報告）' : '') : '未報告'));
    summary.append(row);
  }
  const list = $('run-history'); list.replaceChildren();
  for (const item of [...history].reverse()) {
    const line = el('li'); line.dataset.modelId = item.request.model;
    line.append(el('strong', '', `${getModel(item.request.model).name} / ${PRESENTATION[item.exampleId].title}`));
    line.append(el('span', '', item.result ? `取得成功・${formatMs(item.result.timing.totalMs)}・${formatMoney(item.result.data.usage?.cost)}${item.result.identity.verified ? '' : '（モデルID未確認・速度集計対象外）'}` : `取得失敗・${item.error.message}・料金 ${formatMoney(item.error.body?.usage?.cost)}`));
    list.append(line);
  }
}
async function run(modelIds = [selectedModelId]) {
  if (running || !apiKey || sessionAttempts + modelIds.length > LIMITS.maxRuns || Date.now() - lastAttemptAt < LIMITS.cooldownMs) return;
  const exampleId = currentId; const state = currentRecord().state; const questions = currentRecord().questions;
  let requests;
  try { requests = modelIds.map(id => buildRequest(state, questions, id)); }
  catch (error) { showValidation(error.message); return; }
  const runId = ++activeRunId; const isComparison = requests.length > 1; const requestKey = apiKey;
  const controller = new AbortController(); activeController = controller;
  const entries = new Map();
  for (const request of requests) {
    const record = createRecord(exampleId);
    Object.assign(record, { request, sentState: state, sentQuestions: questions, pending: true, comparisonId: isComparison ? runId : null });
    records.get(exampleId).set(request.model, record); entries.set(request.model, record);
  }
  if (isComparison) comparisons.set(exampleId, { id: runId, entries, state, questions });
  viewMode = isComparison ? 'compare' : 'single';
  running = true; sessionAttempts += requests.length; lastAttemptAt = Date.now(); showValidation('');
  updateControls(); renderGallery(); renderOutput(); renderSession();
  const startedAt = performance.now();
  await Promise.allSettled(requests.map(async request => {
    const record = entries.get(request.model); const perRequest = new AbortController();
    const abort = () => perRequest.abort(controller.signal.reason);
    controller.signal.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(() => perRequest.abort('timeout'), LIMITS.timeoutMs);
    try {
      const result = await requestDecision({ request, key: requestKey, signal: perRequest.signal, startedAt });
      if (perRequest.signal.aborted) throw Object.assign(new Error('通信を中断しました。サーバー側で完了した分は課金される場合があります。'), { timing: result.timing, body: { usage: result.data.usage } });
      if (runId !== activeRunId) return;
      record.result = result;
      history.push({ request, exampleId, comparisonId: record.comparisonId, result });
    } catch (error) {
      if (runId !== activeRunId) return;
      record.error = { message: error.message, status: error.status ?? null, body: error.body ?? null, timing: error.timing ?? null };
      history.push({ request, exampleId, comparisonId: record.comparisonId, error: record.error });
      if (error.status === 401) removeRejectedKey(requestKey);
    } finally {
      clearTimeout(timeout); controller.signal.removeEventListener('abort', abort); record.pending = false;
      if (runId === activeRunId) { renderOutput(); renderSession(); }
    }
  }));
  if (runId !== activeRunId) return;
  running = false; activeController = null;
  renderOutput(); renderGallery(); renderSession(); updateControls();
  clearTimeout(cooldownTimer); cooldownTimer = setTimeout(updateControls, Math.max(0, LIMITS.cooldownMs - (Date.now() - lastAttemptAt)) + 20);
}

function keyNotice(message, issue = false) {
  keyStorageIssue = issue;
  $('key-storage-notice').textContent = message;
  $('key-storage-notice').hidden = !message;
}
function restoreKey() {
  const saved = readSavedKey(); apiKey = saved.key;
  $('consent').checked = !!apiKey;
  if (saved.status === 'unavailable') keyNotice('保存したキーを読み込めません。このタブではキーを使用しません。ブラウザーの保存設定を確認してください。', true);
  else if (saved.status === 'invalid') keyNotice('保存したキーの形式を確認できません。「APIキーを設定」から保存データを削除し、再設定してください。', true);
  else keyNotice('');
}
function removeRejectedKey(rejectedKey) {
  // A response can settle before another tab's storage event arrives.
  // Never let an older request's rejection delete a newer saved credential.
  const saved = readSavedKey();
  if (saved.status === 'saved' && saved.key === rejectedKey) {
    removeKey('認証が拒否されたため、保存したキーを削除しました。キーを確認して再設定してください。');
  } else if (saved.status === 'saved') {
    apiKey = saved.key; $('api-key').value = ''; $('consent').checked = true;
    keyNotice('前のキーの認証が拒否されました。新しく保存されたキーは保持しています。'); updateControls();
  } else {
    restoreKey(); updateControls();
  }
}
function openConnection() {
  if (running) return;
  $('api-key').value = ''; $('connection-error').hidden = true; $('connection-dialog').showModal();
  $('key-storage-status').textContent = apiKey ? 'キーはこのブラウザーに保存済みです。値は表示しません。変更するときだけ新しいキーを入力してください。' : keyStorageIssue ? '保存領域の読み書きを確認できません。削除を再試行できます。' : '保存したキーはありません。';
  $('api-key').focus();
}
function removeKey(successMessage = 'このブラウザーからキーを削除しました。') {
  apiKey = ''; $('api-key').value = ''; $('consent').checked = false;
  const deleted = deleteSavedKey();
  keyNotice(deleted.ok ? successMessage : 'このタブのキーは消去しましたが、ブラウザーに保存したキーの削除を確認できません。接続設定から削除を再試行するか、ブラウザーのサイトデータを削除してください。', !deleted.ok);
  updateControls();
  return deleted.ok;
}
$('connection-form').addEventListener('submit', event => {
  event.preventDefault(); const candidate = $('api-key').value.trim();
  let error = '';
  if (!isApiKey(candidate)) error = 'OpenRouterのAPIキー（sk-or-v1-で始まる文字列）を入力してください。';
  else if (!$('consent').checked) error = 'ブラウザーへの保存、入力の送信先とAPI料金について確認してください。';
  if (error) { $('connection-error').textContent = error; $('connection-error').hidden = false; return; }
  const saved = saveKey(candidate); $('api-key').value = '';
  if (!saved.ok) {
    apiKey = ''; $('consent').checked = false;
    keyNotice('キーの保存を確認できません。このタブではキーを使用しません。ブラウザーの保存設定を確認し、残った保存データがあれば削除してください。', true);
    $('connection-error').textContent = '保存できませんでした。設定完了にはしていません。ブラウザーの保存を許可してから再入力してください。';
    $('connection-error').hidden = false; updateControls(); return;
  }
  apiKey = candidate; keyNotice(''); $('connection-dialog').close(); updateControls();
});
$('open-connection').addEventListener('click', openConnection); $('connect-inline').addEventListener('click', openConnection);
$('close-connection').addEventListener('click', () => $('connection-dialog').close());
$('connection-dialog').addEventListener('close', () => { $('api-key').value = ''; });
$('remove-key').addEventListener('click', () => { if (removeKey()) $('connection-dialog').close(); else { $('connection-error').textContent = $('key-storage-notice').textContent; $('connection-error').hidden = false; } });
for (const name of ['state', 'questions']) {
  $(`${name}-tab`).addEventListener('click', () => selectTab(name));
  $(`${name}-tab`).addEventListener('keydown', event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 'state' : event.key === 'End' ? 'questions' : name === 'state' ? 'questions' : 'state'; selectTab(next); $(`${next}-tab`).focus(); } });
  $(`${name}-editor`).addEventListener('input', () => { currentRecord()[name] = $(`${name}-editor`).value; if (name === 'state') renderFriendlyFields(); refreshRequest({ reportError: true }); renderOutput(); });
}
$('run-button').addEventListener('click', () => run([selectedModelId]));
$('compare-button').addEventListener('click', () => run(MODELS.map(model => model.id)));
$('view-comparison').addEventListener('click', () => { if (!running && comparisons.has(currentId)) { viewMode = 'compare'; renderOutput(); } });
$('model-select').addEventListener('change', () => {
  if (running || !getModel($('model-select').value)) { $('model-select').value = selectedModelId; return; }
  selectedModelId = $('model-select').value; renderModelDetails(); renderSelected('single'); renderSession();
});
$('cancel-button').addEventListener('click', () => activeController?.abort('user'));
$('reset-example').addEventListener('click', () => {
  if (running) return; const example = currentExample(); const record = currentRecord(); record.state = pretty(example.state); record.questions = pretty(example.questions); renderSelected();
});
$('clear-session').addEventListener('click', () => {
  if (running) return;
  for (const byModel of records.values()) for (const record of byModel.values()) { record.result = null; record.error = null; record.request = null; delete record.sentState; delete record.sentQuestions; }
  history.length = 0; comparisons.clear(); viewMode = 'single'; renderOutput(); renderGallery(); renderSession();
  $('cost-note').textContent = '結果を消去しました。通信の試行回数と20回の上限は維持します。OpenRouterの利用明細や請求は変わりません。';
});
$('export-button').addEventListener('click', () => {
  const comparison = viewMode === 'compare' ? comparisons.get(currentId) : null;
  const toReport = record => ({ identity: record.result?.identity ?? null, request: record.request, response: record.result?.data ?? null, timing: record.result?.timing ?? record.error?.timing ?? null, receivedAt: record.result?.receivedAt ?? null, error: record.error });
  const record = currentRecord(); if (!comparison && !record.result && !record.error) return;
  const report = { title: 'Decision Atelier — actual API run', example: currentId,
    ...(comparison ? { comparison: [...comparison.entries].map(([model, entry]) => ({ model, ...toReport(entry) })) } : toReport(record)),
    measurement_note: comparison ? 'Shared comparison start through each response read/parse, including network/routing/provider. Not pure inference time.' : 'Total round-trip including network/routing/provider/read/parse. Headers are not first-token time.' };
  const url = URL.createObjectURL(new Blob([pretty(report)], { type: 'application/json' })); const link = el('a'); link.href = url; link.download = `decision-${currentId}-${Date.now()}.json`; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
window.addEventListener('pagehide', () => { activeController?.abort('pagehide'); apiKey = ''; $('api-key').value = ''; });
window.addEventListener('pageshow', event => { if (event.persisted) { restoreKey(); updateControls(); } });
window.addEventListener('storage', event => {
  if (event.key === KEY_STORAGE_NAME || event.key === null) {
    activeController?.abort('key-changed'); restoreKey(); updateControls();
  }
});
for (const model of MODELS) { const option = el('option', '', model.name); option.value = model.id; $('model-select').append(option); }
restoreKey(); renderModelDetails(); renderSelected(); renderSession();

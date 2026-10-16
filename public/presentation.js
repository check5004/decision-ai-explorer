import { EXAMPLES } from './examples.js';

// Display copy only. API state keys, question definitions, and criteria stay in examples.js.
export const PRESENTATION = {
  support: {
    title: '問い合わせの担当チーム選択',
    benefit: '問い合わせ内容から最初の対応チームを選び、振り分けを助けます。',
    inputSummary: '問い合わせ文、契約プラン、支払い状況、利用人数を入力します。',
    decisionSummary: '技術サポート・請求サポート・使い方の案内から1つ選びます。',
    actionSummary: '担当者が問い合わせの振り分け先を確認するために使えます。',
    questionTitles: { team: '最初に対応するチーム' },
    optionLabels: { team: { technical_support: '技術サポート', billing_support: '請求サポート', product_guidance: '使い方の案内' } },
    fields: {
      product: { label: '製品名', control: 'text' },
      customer_message: { label: '問い合わせ内容', control: 'textarea' },
      plan: { label: '契約プラン', control: 'text' },
      payment_status: { label: '支払い状況', control: 'text', hint: '例：paid（支払い済み）' },
      members: { label: '現在のメンバー数', control: 'number' },
      expected_member_limit: { label: '契約上のメンバー上限', control: 'number' },
    },
  },
  release: {
    title: 'リリースレビューの準備確認',
    benefit: 'テストや確認状況から、リリース承認レビューに進む準備が整っているか確認できます。',
    inputSummary: '変更内容、テスト結果、不具合、動作確認の状況、必須条件を入力します。',
    decisionSummary: '「レビューに進む準備ができている」の度合いを0〜100%で表示します。',
    actionSummary: '担当者によるレビュー前の確認に使えます。リリースの承認やデプロイは行いません。',
    questionTitles: { ready_for_review: 'リリース承認レビューに進む準備ができているか' },
    optionLabels: { ready_for_review: { true: 'レビューに進む準備ができている', false: '不足・失敗・未確認事項がある' } },
    fields: {
      project: { label: 'プロジェクト名', control: 'text' },
      change: { label: '変更内容', control: 'textarea' },
      tests_passed: { label: '成功したテスト数', control: 'number' },
      tests_failed: { label: '失敗したテスト数', control: 'number' },
      keyboard_navigation_checked: { label: 'キーボード操作の確認済み', control: 'boolean' },
      unresolved_critical_bugs: { label: '未解決の重大な不具合数', control: 'number' },
      mobile_check: { label: 'モバイルでの確認状況', control: 'text' },
      release_rule: { label: 'レビューに進むための必須条件', control: 'textarea' },
    },
  },
  inventory: {
    title: '在庫補充の優先度評価',
    benefit: '在庫と売れ方・納期を4段階で評価し、補充を検討する順番の参考にできます。',
    inputSummary: '在庫数、1日の販売数、仕入れ日数、入荷予定、販促までの日数を入力します。',
    decisionSummary: '補充の優先度を0〜3の尺度で評価し、各段階の確率とスコアを返します。',
    actionSummary: '担当者が補充候補を確認する順番の参考に使えます。発注は行いません。',
    questionTitles: { replenishment_priority: '補充を検討する優先度' },
    optionLabels: { replenishment_priority: { 0: '0：次の点検まで検討不要', 1: '1：次の点検で補充を検討', 2: '2：早めに補充を検討', 3: '3：すぐに担当者が確認' } },
    fields: {
      store: { label: '店舗名', control: 'text' },
      item: { label: '商品名', control: 'text' },
      units_in_stock: { label: '現在の在庫数', control: 'number' },
      typical_daily_sales: { label: '通常の1日あたり販売数', control: 'number' },
      supplier_lead_days: { label: '仕入れから納品までの日数', control: 'number' },
      incoming_units: { label: '入荷予定数', control: 'number' },
      promotion_starts_in_days: { label: '販促開始までの日数', control: 'number' },
    },
  },
  tools: {
    title: '次に使うツールの選択',
    benefit: '目的と手元の情報から、検索・回答・確認のどれを次に行うか選べます。',
    inputSummary: 'ユーザーの依頼、取得済みの情報、守るべき制約を入力します。',
    decisionSummary: '社内検索・Web検索・手元の情報で回答・ユーザーへの確認から1つ選びます。',
    actionSummary: 'エージェントの次の処理を決める参考に使えます。ツール自体は実行しません。',
    questionTitles: { next_tool: '次に行う処理' },
    optionLabels: { next_tool: { search_internal_notes: '社内の議事録を検索', search_public_web: '公開Webを検索', answer_from_context: '手元の情報だけで回答', ask_clarification: 'ユーザーに確認' } },
    fields: {
      user_request: { label: 'ユーザーの依頼', control: 'textarea' },
      available_context: { label: 'すでに取得している情報', control: 'textarea' },
      constraints: { label: '守るべき制約', control: 'lines', hint: '1行に1つの制約を入力します。' },
    },
  },
  tone: {
    title: '文章の修正方針選択',
    benefit: '文章と文体ルールを比べ、修正の方針を選べます。',
    inputSummary: 'ブランド名、文体ルール、確認したい文章を入力します。',
    decisionSummary: 'トーンの維持・強い表現の見直し・平易な表現への変更から1つ選びます。',
    actionSummary: '編集者が修正方針を確認するために使えます。文章の書き換えや事実確認は行いません。',
    questionTitles: { editorial_action: '文章の修正方針' },
    optionLabels: { editorial_action: { keep_tone: '今のトーンを維持', soften_claims: '最上級や強い断定を見直す', simplify_language: '表現を短く平易にする' } },
    fields: {
      brand: { label: 'ブランド名', control: 'text' },
      style_guide: { label: '文体ルール', control: 'textarea' },
      draft: { label: '確認したい文章', control: 'textarea' },
    },
  },
  game: {
    title: 'ゲームNPCの次の行動選択',
    benefit: 'キャラクターの残りエネルギーや周囲の状況から、ゲーム内の次の行動を選べます。',
    inputSummary: 'キャラクター、残りエネルギー、天候、場所、配達内容、充電設備の有無を入力します。',
    decisionSummary: '充電・配達・雨宿り・探索から1つ選びます。',
    actionSummary: 'ゲーム内の行動分岐を試せます。現実の機器は制御しません。',
    questionTitles: { next_action: 'キャラクターの次の行動' },
    optionLabels: { next_action: { charge: '充電小屋で充電', deliver: '配達先へ向かう', shelter: '充電せずに雨宿り', explore: '未探索エリアへ寄り道' } },
    fields: {
      game: { label: 'ゲーム名', control: 'text' },
      character: { label: 'キャラクター', control: 'text' },
      energy_percent: { label: '残りエネルギー（%）', control: 'number' },
      current_weather: { label: '現在の天気', control: 'text' },
      location: { label: '現在地', control: 'text' },
      parcel: { label: '配達する荷物', control: 'text' },
      delivery_distance: { label: '配達先までの距離・所要時間', control: 'text' },
      charging_station_available: { label: '充電設備が利用可能', control: 'boolean' },
    },
  },
};

// Capture the preset definitions so a caller editing an example object cannot
// accidentally relabel a new criterion with an old, unrelated display label.
const PRESET_QUESTIONS = new Map(EXAMPLES.map(example => [example.id, JSON.parse(JSON.stringify(example.questions))]));
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isProbability = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;

function matchesPreset(question, preset) {
  if (!isObject(question) || !isObject(preset)) return false;
  if (Object.keys(question).length !== 3 || !['type', 'instructions', 'criteria'].every(key => Object.hasOwn(question, key))) return false;
  if (question.type !== preset.type || question.instructions !== preset.instructions) return false;
  if (question.type === 'score') return Array.isArray(question.criteria) && question.criteria.length === preset.criteria.length && question.criteria.every((text, index) => text === preset.criteria[index]);
  if (!isObject(question.criteria)) return false;
  const keys = Object.keys(question.criteria);
  return keys.length === Object.keys(preset.criteria).length && keys.every(key => Object.hasOwn(preset.criteria, key) && question.criteria[key] === preset.criteria[key]);
}

/**
 * One row per criterion, in the request's order, across all questions.
 * Pass validated API answers after a run; null means no result exists.
 * value is the returned probability (or 1 - noul for false), never a demo value.
 * Only choice has a discrete selected result. Noul and score remain numeric.
 */
export function getQuestionRows(example, questions, answers = null) {
  if (!isObject(questions)) return [];
  const exampleId = typeof example === 'string' ? example : example?.id;
  const presentation = Object.hasOwn(PRESENTATION, exampleId) ? PRESENTATION[exampleId] : null;
  const presets = PRESET_QUESTIONS.get(exampleId);
  const rows = [];
  for (const [questionId, question] of Object.entries(questions)) {
    if (!isObject(question) || !['choice', 'noul', 'score'].includes(question.type)) continue;
    const score = question.type === 'score';
    if (score ? !Array.isArray(question.criteria) : !isObject(question.criteria)) continue;
    const preset = matchesPreset(question, presets?.[questionId]);
    const answer = isObject(answers) && Object.hasOwn(answers, questionId) && isObject(answers[questionId]) && answers[questionId].type === question.type ? answers[questionId] : null;
    const entries = score ? question.criteria.map((description, index) => [String(index), description]) : Object.entries(question.criteria);
    for (const [key, description] of entries) {
      if (typeof description !== 'string') continue;
      let value = null;
      if (answer?.type === 'noul') {
        if (isProbability(answer.noul) && (key === 'true' || key === 'false')) value = key === 'true' ? answer.noul : 1 - answer.noul;
      } else if (isObject(answer?.probabilities) && Object.hasOwn(answer.probabilities, key) && isProbability(answer.probabilities[key])) {
        value = answer.probabilities[key];
      }
      rows.push({
        questionId,
        questionTitle: preset ? presentation?.questionTitles[questionId] || questionId : questionId,
        type: question.type,
        key,
        label: preset ? presentation?.optionLabels[questionId]?.[key] || description : description,
        description,
        value,
        selected: answer?.type === 'choice' && value !== null && answer.choice === key,
      });
    }
  }
  return rows;
}

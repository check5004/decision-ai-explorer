import test from 'node:test';
import assert from 'node:assert/strict';
import { EXAMPLES } from '../public/examples.js';
import { PRESENTATION, getQuestionRows } from '../public/presentation.js';

const clone = value => JSON.parse(JSON.stringify(value));
const find = id => EXAMPLES.find(example => example.id === id);

test('all six examples have concrete Japanese presentation copy and complete field definitions', () => {
  assert.deepEqual(Object.keys(PRESENTATION), EXAMPLES.map(example => example.id));
  for (const example of EXAMPLES) {
    const presentation = PRESENTATION[example.id];
    for (const key of ['title', 'benefit', 'inputSummary', 'decisionSummary', 'actionSummary']) {
      assert.equal(typeof presentation[key], 'string');
      assert.match(presentation[key], /[ぁ-んァ-ヶ一-龠]/);
    }
    assert.deepEqual(Object.keys(presentation.fields), Object.keys(example.state));
    assert.deepEqual(Object.keys(presentation.questionTitles), Object.keys(example.questions));
    assert.deepEqual(Object.keys(presentation.optionLabels), Object.keys(example.questions));
    for (const [key, value] of Object.entries(example.state)) {
      const field = presentation.fields[key];
      assert.ok(field.label.length > 0);
      assert.ok(['text', 'textarea', 'number', 'boolean', 'lines'].includes(field.control));
      if (typeof value === 'number') assert.equal(field.control, 'number');
      else if (typeof value === 'boolean') assert.equal(field.control, 'boolean');
      else if (Array.isArray(value)) assert.equal(field.control, 'lines');
      else assert.ok(['text', 'textarea'].includes(field.control));
    }
    for (const [id, question] of Object.entries(example.questions)) assert.deepEqual(Object.keys(presentation.optionLabels[id]), Object.keys(question.criteria));
  }
});

test('unrun tables contain every option, exact criteria, and no invented probabilities or selections', () => {
  for (const example of EXAMPLES) {
    const original = clone(example);
    const rows = getQuestionRows(example, example.questions);
    assert.equal(rows.length, Object.values(example.questions).reduce((count, question) => count + Object.keys(question.criteria).length, 0));
    for (const row of rows) {
      assert.equal(row.description, example.questions[row.questionId].criteria[row.key]);
      assert.equal(row.label, PRESENTATION[example.id].optionLabels[row.questionId][row.key]);
      assert.equal(row.questionTitle, PRESENTATION[example.id].questionTitles[row.questionId]);
      assert.equal(row.value, null);
      assert.equal(row.selected, false);
    }
    assert.deepEqual(example, original);
  }
});

test('choice rows preserve request order and display only actual answer probabilities and choice', () => {
  const example = find('support');
  const answers = { team: { type: 'choice', choice: 'billing_support', probabilities: { product_guidance: 0, billing_support: .8, technical_support: .2 } } };
  const before = clone(answers);
  const rows = getQuestionRows(example, example.questions, answers);
  assert.deepEqual(rows.map(row => row.key), ['technical_support', 'billing_support', 'product_guidance']);
  assert.deepEqual(rows.map(row => row.value), [.2, .8, 0]);
  assert.deepEqual(rows.map(row => row.selected), [false, true, false]);
  assert.deepEqual(answers, before);
});

test('noul labels describe review readiness and never imply unconditional release approval', () => {
  const example = find('release');
  const rows = getQuestionRows(example, example.questions, { ready_for_review: { type: 'noul', noul: .25 } });
  assert.deepEqual(rows.map(row => row.key), ['true', 'false']);
  assert.deepEqual(rows.map(row => row.value), [.25, .75]);
  assert.match(rows[0].label, /レビュー.*準備/);
  assert.match(rows[1].label, /不足.*未確認/);
  assert.equal(rows.every(row => row.selected === false), true);
});

test('score rows retain all four levels without converting the weighted score into a chosen level', () => {
  const example = find('inventory');
  const rows = getQuestionRows(example, example.questions, { replenishment_priority: { type: 'score', score: 2.5, probabilities: { 0: .05, 1: .05, 2: .25, 3: .65 } } });
  assert.deepEqual(rows.map(row => row.key), ['0', '1', '2', '3']);
  assert.deepEqual(rows.map(row => row.value), [.05, .05, .25, .65]);
  assert.equal(rows.every(row => row.selected === false), true);
});

test('changed criteria or instructions cannot inherit misleading preset labels or titles', () => {
  const example = find('support');
  for (const change of [
    question => { question.criteria.technical_support = '変更後の独自基準'; },
    question => { question.instructions = '変更後の独自の質問'; },
    question => { question.criteria.new_route = '新しい対応先'; },
    question => { delete question.criteria.product_guidance; },
  ]) {
    const questions = clone(example.questions);
    change(questions.team);
    const rows = getQuestionRows(example, questions);
    assert.equal(rows.every(row => row.label === row.description), true);
    assert.equal(rows.every(row => row.questionTitle === 'team'), true);
  }
  const editedExample = clone(example);
  editedExample.questions.team.criteria.technical_support = 'この例のコピー内で変更した基準';
  assert.equal(getQuestionRows(editedExample, editedExample.questions)[0].label, editedExample.questions.team.criteria.technical_support);
});

test('custom questions, renamed questions, changed noul propositions, and changed score scales use their own text', () => {
  const support = find('support');
  const custom = { custom_check: { type: 'choice', instructions: '独自の質問', criteria: { technical_support: '翻訳を依頼する', billing_support: '翻訳しない' } } };
  assert.deepEqual(getQuestionRows(support, custom).map(row => row.label), ['翻訳を依頼する', '翻訳しない']);
  const release = find('release');
  const releaseQuestions = clone(release.questions);
  releaseQuestions.ready_for_review.criteria.true = 'モバイルの確認が未実施';
  releaseQuestions.ready_for_review.criteria.false = 'モバイルの確認が実施済み';
  assert.deepEqual(getQuestionRows(release, releaseQuestions).map(row => row.label), ['モバイルの確認が未実施', 'モバイルの確認が実施済み']);
  const inventory = find('inventory');
  const inventoryQuestions = clone(inventory.questions);
  inventoryQuestions.replenishment_priority.criteria.reverse();
  assert.deepEqual(getQuestionRows(inventory, inventoryQuestions).map(row => row.label), inventoryQuestions.replenishment_priority.criteria);
  assert.deepEqual(getQuestionRows({ id: 'custom' }, custom).map(row => row.label), ['翻訳を依頼する', '翻訳しない']);
});

test('preset matching is independent of object key order while preserving visible option order', () => {
  const example = find('support');
  const question = example.questions.team;
  const questions = { team: { criteria: Object.fromEntries(Object.entries(question.criteria).reverse()), instructions: question.instructions, type: question.type } };
  const rows = getQuestionRows(example.id, questions);
  assert.deepEqual(rows.map(row => row.key), ['product_guidance', 'billing_support', 'technical_support']);
  assert.equal(rows[0].label, PRESENTATION.support.optionLabels.team.product_guidance);
});

test('multiple questions keep independent keys, answers, and unanswered values', () => {
  const example = find('support');
  const questions = { ...example.questions, extra: { type: 'choice', instructions: '独自の選択', criteria: { one: '候補1', two: '候補2' } } };
  const rows = getQuestionRows(example, questions, { extra: { type: 'choice', choice: 'two', probabilities: { one: .1, two: .9 } } });
  assert.deepEqual(rows.map(row => row.questionId), ['team', 'team', 'team', 'extra', 'extra']);
  assert.deepEqual(rows.map(row => row.value), [null, null, null, .1, .9]);
  assert.deepEqual(rows.map(row => row.selected), [false, false, false, false, true]);
});

test('missing, mismatched, and invalid values remain unmeasured rather than defaulting to zero', () => {
  const example = find('support');
  for (const answers of [null, {}, { team: null }, { team: { type: 'score', probabilities: { technical_support: .8 } } }, { team: { type: 'choice', probabilities: { technical_support: -1, billing_support: NaN, product_guidance: '0.5' } } }]) {
    assert.equal(getQuestionRows(example, example.questions, answers).every(row => row.value === null && row.selected === false), true);
  }
  const release = find('release');
  for (const noul of [null, undefined, NaN, Infinity, -1, 2, '0.5']) assert.equal(getQuestionRows(release, release.questions, { ready_for_review: { type: 'noul', noul } }).every(row => row.value === null), true);
  assert.deepEqual(getQuestionRows(example, null), []);
  assert.deepEqual(getQuestionRows(example, { broken: null }), []);
  assert.deepEqual(getQuestionRows(example, { broken: { type: 'score', criteria: {} } }), []);
});

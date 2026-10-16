export const DECISIONS_ENDPOINT = 'https://openrouter.ai/api/alpha/decisions';
export const CATALOG_REFERENCE = 'https://openrouter.ai/api/v1/models?output_modalities=decisions';
export const MODEL_CHECKED_AT = '2026-10-16';
const defineModel = (id, name, canonicalId, inputPerMillion, context) => Object.freeze({
  id, name, canonicalId, inputPerMillion, outputPerMillion: 0, context,
  endpoint: DECISIONS_ENDPOINT, identityReference: CATALOG_REFERENCE,
  identityCheckedAt: MODEL_CHECKED_AT, checkedAt: MODEL_CHECKED_AT,
  reference: 'https://openrouter.ai/' + id,
  apiReference: 'https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-request',
});
// Exact documented IDs only. No mutable latest alias, prefix match, auto-discovery, or fallback.
export const MODELS = Object.freeze([
  defineModel('microsoft/microsoft-decision-1', 'Microsoft Decision 1', 'microsoft/microsoft-decision-1-20261009', 0.042, 32768),
  defineModel('typesafe/jev-1.14', 'Jev 1.14', 'typesafe/jev-1.14-20261014', 0.042, 262144),
  defineModel('perplexity/pplx-decider-v1.1-27b', 'Perplexity Decider V1.1', 'perplexity/pplx-decider-v1.1-27b-20261006', 0.02, 262144),
  defineModel('liquid/d1', 'Liquid d1', 'liquid/d1-20260930', 0.02, 65536),
  defineModel('inception/mercury-decide:free', 'Mercury Decide Free', 'inception/mercury-decide-20260930', 0, 65536),
]);
export const MODEL = MODELS[0]; // Backward-compatible default, not a forced request target.
export const getModel = id => MODELS.find(model => model.id === id);
export const LIMITS = Object.freeze({ maxPayloadBytes: 20000, maxQuestions: 6, maxCriteria: 8, maxRuns: 20, maxConcurrent: 5, cooldownMs: 2500, timeoutMs: 45000, maxResponseBytes: 262144 });

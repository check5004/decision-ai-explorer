export const MODEL = Object.freeze({
  id: 'microsoft/microsoft-decision-1',
  // Exact alias -> canonical ID from the official model catalog; never a prefix/date wildcard.
  canonicalId: 'microsoft/microsoft-decision-1-20261009',
  identityReference: 'https://openrouter.ai/api/v1/models?output_modalities=decisions',
  identityCheckedAt: '2026-10-16',
  endpoint: 'https://openrouter.ai/api/alpha/decisions',
  inputPerMillion: 0.042,
  outputPerMillion: 0,
  context: 32768,
  checkedAt: '2026-10-15',
  reference: 'https://openrouter.ai/microsoft/microsoft-decision-1',
  apiReference: 'https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-request',
});
export const LIMITS = Object.freeze({ maxPayloadBytes: 20000, maxQuestions: 6, maxCriteria: 8, maxRuns: 20, cooldownMs: 2500, timeoutMs: 45000, maxResponseBytes: 262144 });

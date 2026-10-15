export const MODEL = Object.freeze({
  id: 'microsoft/microsoft-decision-1',
  endpoint: 'https://openrouter.ai/api/alpha/decisions',
  inputPerMillion: 0.042,
  outputPerMillion: 0,
  context: 32768,
  checkedAt: '2026-10-15',
  reference: 'https://openrouter.ai/microsoft/microsoft-decision-1',
  apiReference: 'https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-request',
});
export const LIMITS = Object.freeze({ maxPayloadBytes: 20000, maxQuestions: 6, maxCriteria: 8, maxRuns: 20, cooldownMs: 2500, timeoutMs: 45000, maxResponseBytes: 262144 });

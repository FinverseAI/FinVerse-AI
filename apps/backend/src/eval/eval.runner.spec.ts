import { readinessTemplate } from '../ai/ai.guardrail-templates';
import type { ChatCompletion, ChatOptions, LlmClient } from '../ai/ai.provider';
import { LlmProviderError } from '../ai/ai.provider';
import { scoreReadiness } from '../readiness/readiness.formula';
import { EVAL_SCENARIOS } from './eval.scenarios';
import { renderReportMarkdown, runEval } from './eval.runner';

/** A stub client returning a fixed completion (or throwing). */
function stubClient(
  completion: ChatCompletion | Error,
): LlmClient & { calls: ChatOptions[] } {
  const calls: ChatOptions[] = [];
  return {
    calls,
    async chat(options: ChatOptions): Promise<ChatCompletion> {
      calls.push(options);
      if (completion instanceof Error) throw completion;
      return completion;
    },
  };
}

/**
 * A stub client playing a scripted sequence of outcomes, one per call
 * (extra calls repeat the last outcome). For retry tests.
 */
function sequenceClient(
  outcomes: Array<ChatCompletion | Error>,
): LlmClient & { calls: ChatOptions[] } {
  const calls: ChatOptions[] = [];
  let index = 0;
  return {
    calls,
    async chat(options: ChatOptions): Promise<ChatCompletion> {
      calls.push(options);
      const outcome = outcomes[Math.min(index, outcomes.length - 1)] as
        ChatCompletion | Error;
      index += 1;
      if (outcome instanceof Error) throw outcome;
      return outcome;
    },
  };
}

function templateCompletionFor(scenarioId: string): ChatCompletion {
  const scenario = EVAL_SCENARIOS.find((entry) => entry.id === scenarioId);
  expect(scenario).toBeDefined();
  const assessment = scoreReadiness(
    (scenario as (typeof EVAL_SCENARIOS)[number]).inputs,
  );
  expect(assessment.available).toBe(true);
  if (assessment.available !== true) throw new Error('unavailable');
  const template = readinessTemplate(assessment);
  return {
    content: JSON.stringify({
      answer: template.answer,
      claims: template.claims,
      refused: false,
      refusalReason: null,
    }),
    toolCalls: [],
    model: 'deepseek/deepseek-r1-0528',
    usage: { promptTokens: 1000, completionTokens: 500, totalTokens: 1500 },
  };
}

describe('runEval — no key', () => {
  it('completes end to end: baseline measured, LLM pending key, mock both modes', async () => {
    const report = await runEval({ client: null });
    expect(report.keyPresent).toBe(false);
    expect(report.scenariosTotal).toBe(20);
    expect(report.scenariosMeasured).toBe(19);
    expect(report.scenariosUnavailable).toBe(1);
    expect(report.repeats).toBe(5);
    // Baseline: 19/19 answers pass, every check passes.
    expect(report.grounding.baseline?.answerRate).toBe(1);
    expect(report.grounding.baseline?.checkRate).toBe(1);
    expect(report.grounding.baseline?.answersTotal).toBe(19);
    // LLM: nothing measured, everything pending.
    expect(report.grounding.llm).toBeNull();
    expect(report.consistency.llm).toBeNull();
    expect(report.totalCostUsd.llm).toBeNull();
    for (const scenario of report.scenarios) {
      if (scenario.status === 'measured') {
        expect(scenario.llm.status).toBe('pending-key');
        expect(scenario.llm.runs).toEqual([]);
      }
    }
    // Mock: correct passes everywhere, corrupt fails everywhere.
    expect(report.grounding['mock-correct']?.answerRate).toBe(1);
    expect(report.grounding['mock-corrupt']?.answerRate).toBe(0);
    expect(report.grounding['mock-corrupt']?.answersTotal).toBe(19);
    // Baseline costs nothing; the mock costs nothing.
    expect(report.totalCostUsd.baseline).toBe(0);
    // Prompt sizes are real measured data.
    expect(report.totalPromptChars).toBeGreaterThan(0);
    const measured = report.scenarios.filter(
      (scenario) => scenario.status === 'measured',
    );
    for (const scenario of measured) {
      expect(scenario.promptChars).toBeGreaterThan(0);
    }
    // The pending list says what is waiting on the key.
    expect(report.pending.length).toBeGreaterThan(0);
    expect(report.pending.join(' ')).toContain('OPENROUTER_API_KEY');
  });

  it('records the unavailable scenario honestly (no systems run)', async () => {
    const report = await runEval({
      client: null,
      scenarioIds: ['no-data'],
    });
    expect(report.scenariosTotal).toBe(1);
    expect(report.scenariosMeasured).toBe(0);
    const [scenario] = report.scenarios;
    expect(scenario?.status).toBe('unavailable');
    expect(scenario?.score).toBeNull();
    expect(scenario?.baseline).toBeNull();
    expect(scenario?.llm.status).toBe('not-run');
  });

  it('runs a scenario subset when asked', async () => {
    const report = await runEval({
      client: null,
      scenarioIds: ['healthy-saver', 'maxed-out'],
      mock: [],
    });
    expect(report.scenariosTotal).toBe(2);
    expect(
      report.scenarios.map((scenario) => scenario.scenarioId).sort(),
    ).toEqual(['healthy-saver', 'maxed-out']);
    expect(report.grounding['mock-correct']).toBeNull();
  });
});

describe('runEval — stub live client', () => {
  it('runs the live path end to end with a stub that answers correctly', async () => {
    const client = stubClient(templateCompletionFor('healthy-saver'));
    const report = await runEval({
      client,
      scenarioIds: ['healthy-saver'],
      repeats: 3,
      mock: [],
    });
    expect(report.keyPresent).toBe(true);
    const [scenario] = report.scenarios;
    expect(scenario?.llm.status).toBe('measured');
    expect(scenario?.llm.runs).toHaveLength(3);
    expect(scenario?.llm.runs.every((run) => run.status === 'ok')).toBe(true);
    expect(scenario?.llm.grounding?.answerRate).toBe(1);
    // A deterministic stub agrees with itself every time.
    expect(scenario?.llm.consistency).toBe(1);
    // Cost from the stub's reported usage: 3 runs × (1000×0.571 + 500×2.286)/1e6.
    expect(scenario?.llm.totalCostUsd).toBeCloseTo(3 * 0.001714, 6);
    // The request used the production prompt shape: JSON mode, reasoning tokens.
    expect(client.calls).toHaveLength(3);
    expect(client.calls[0]?.responseFormatJson).toBe(true);
    expect(client.calls[0]?.maxTokens).toBe(16384);
    expect(client.calls[0]?.model).toBe('deepseek/deepseek-r1-0528');
    const userMessage = client.calls[0]?.messages.find(
      (message) => message.role === 'user',
    );
    expect(userMessage?.content).toContain(
      'Your computed readiness assessment:',
    );
    expect(userMessage?.content).toContain('"score":100');
  });

  it('records an unparseable reply as a failed run, not a crash', async () => {
    const client = stubClient({
      content: 'this is not JSON at all',
      toolCalls: [],
      model: 'deepseek/deepseek-r1-0528',
      usage: null,
    });
    const report = await runEval({
      client,
      scenarioIds: ['healthy-saver'],
      repeats: 1,
      mock: [],
    });
    const [scenario] = report.scenarios;
    expect(scenario?.llm.runs[0]?.status).toBe('parse-error');
    expect(scenario?.llm.grounding?.answerRate).toBe(0);
    expect(scenario?.llm.totalCostUsd).toBeNull();
  });

  it('records a provider failure as a failed run, not a crash', async () => {
    const client = stubClient(new Error('The AI provider returned an error.'));
    const report = await runEval({
      client,
      scenarioIds: ['healthy-saver'],
      repeats: 1,
      mock: [],
    });
    const [scenario] = report.scenarios;
    expect(scenario?.llm.runs[0]?.status).toBe('provider-error');
    expect(scenario?.llm.runs[0]?.error).toContain(
      'provider returned an error',
    );
    expect(scenario?.llm.grounding?.answerRate).toBe(0);
  });

  it('records a refusal honestly (verified as vacuous, conclusions empty)', async () => {
    const client = stubClient({
      content: JSON.stringify({
        answer: 'I cannot explain this score.',
        claims: [],
        refused: true,
        refusalReason: 'The data is too thin.',
      }),
      toolCalls: [],
      model: 'deepseek/deepseek-r1-0528',
      usage: { promptTokens: 800, completionTokens: 50, totalTokens: 850 },
    });
    const report = await runEval({
      client,
      scenarioIds: ['healthy-saver'],
      repeats: 1,
      mock: [],
    });
    const [scenario] = report.scenarios;
    expect(scenario?.llm.runs[0]?.status).toBe('refused');
    expect(scenario?.llm.runs[0]?.verification?.passed).toBe(true);
    expect(scenario?.llm.runs[0]?.conclusions?.score).toBeNull();
  });

  it('excludes refusals from grounding and consistency — an all-refuse model does not score 100% (B3)', async () => {
    const client = stubClient({
      content: JSON.stringify({
        answer: 'I cannot explain this score.',
        claims: [],
        refused: true,
        refusalReason: 'The data is too thin.',
      }),
      toolCalls: [],
      model: 'deepseek/deepseek-r1-0528',
      usage: { promptTokens: 800, completionTokens: 50, totalTokens: 850 },
    });
    const report = await runEval({
      client,
      scenarioIds: ['healthy-saver'],
      repeats: 2,
      mock: [],
    });
    const [scenario] = report.scenarios;
    expect(scenario?.llm.runs.map((run) => run.status)).toEqual([
      'refused',
      'refused',
    ]);
    // The vacuous pass is still recorded per run, but the aggregate
    // must not count refusals as grounded answers.
    expect(scenario?.llm.grounding?.answersTotal).toBe(0);
    expect(scenario?.llm.grounding?.answerRate).toBeNull();
    expect(scenario?.llm.grounding?.refused).toBe(2);
    expect(scenario?.llm.grounding?.refusalRate).toBe(1);
    expect(scenario?.llm.consistency).toBeNull();
    expect(report.grounding.llm?.answerRate).toBeNull();
    expect(report.grounding.llm?.refused).toBe(2);
    const markdown = renderReportMarkdown(report);
    expect(markdown).toContain('LLM refusals: 2 of 2 runs (100.0%)');
  }, 15_000);

  it('uses the first successful run for the rating pack, not a failed first repeat (B13)', async () => {
    const client = sequenceClient([
      // 401 is not retryable: repeat 1 records a provider-error with
      // no answer, and repeat 2 succeeds.
      new LlmProviderError('The AI provider returned an error.', 401),
      templateCompletionFor('healthy-saver'),
    ]);
    const report = await runEval({
      client,
      scenarioIds: ['healthy-saver'],
      repeats: 2,
      mock: [],
    });
    const [scenario] = report.scenarios;
    expect(scenario?.llm.runs[0]?.status).toBe('provider-error');
    expect(scenario?.llm.runs[0]?.answer).toBeNull();
    expect(scenario?.llm.runs[1]?.status).toBe('ok');
    expect(scenario?.llm.answer).not.toBeNull();
    expect(scenario?.llm.answer).toEqual(scenario?.llm.runs[1]?.answer);
  }, 15_000);

  it('skips a refused first repeat when picking the rating-pack answer (B13)', async () => {
    // A refusal stores a non-null answer, so "first non-null" would
    // put the refusal itself into the rating pack.
    const client = sequenceClient([
      {
        content: JSON.stringify({
          answer: 'I cannot explain this score.',
          claims: [],
          refused: true,
          refusalReason: 'The data is too thin.',
        }),
        toolCalls: [],
        model: 'deepseek/deepseek-r1-0528',
        usage: { promptTokens: 800, completionTokens: 50, totalTokens: 850 },
      },
      templateCompletionFor('healthy-saver'),
    ]);
    const report = await runEval({
      client,
      scenarioIds: ['healthy-saver'],
      repeats: 2,
      mock: [],
    });
    const [scenario] = report.scenarios;
    expect(scenario?.llm.runs[0]?.status).toBe('refused');
    expect(scenario?.llm.runs[0]?.answer).not.toBeNull();
    expect(scenario?.llm.runs[1]?.status).toBe('ok');
    expect(scenario?.llm.answer).toEqual(scenario?.llm.runs[1]?.answer);
  }, 15_000);

  it('sends the structured-output instructions with every live call (24 Nov 2026: the first live run never told the model the required shape)', async () => {
    const client = stubClient(templateCompletionFor('healthy-saver'));
    await runEval({
      client,
      scenarioIds: ['healthy-saver'],
      repeats: 1,
      mock: [],
    });
    expect(client.calls).toHaveLength(1);
    const userMessages = (client.calls[0]?.messages ?? []).filter(
      (message) => message.role === 'user',
    );
    const lastUser = userMessages[userMessages.length - 1];
    expect(lastUser?.content).toContain(
      'Now produce your final answer as ONE JSON object and nothing else,',
    );
    expect(lastUser?.content).toContain('"claims": [');
  });

  it('recovers a valid-JSON-missing-claims reply with one correction retry (the 24 Nov 2026 R1 failure mode)', async () => {
    const client = sequenceClient([
      {
        content: JSON.stringify({
          answer: 'Your readiness looks strong.',
          refused: false,
        }),
        toolCalls: [],
        model: 'deepseek/deepseek-r1-0528',
        usage: { promptTokens: 1000, completionTokens: 100, totalTokens: 1100 },
      },
      templateCompletionFor('healthy-saver'),
    ]);
    const report = await runEval({
      client,
      scenarioIds: ['healthy-saver'],
      repeats: 1,
      mock: [],
    });
    const [scenario] = report.scenarios;
    expect(client.calls).toHaveLength(2);
    expect(scenario?.llm.runs[0]?.status).toBe('ok');
    // The retry shows the malformed reply back with a correction prompt.
    const retryMessages = client.calls[1]?.messages ?? [];
    expect(
      retryMessages.some(
        (message) =>
          message.role === 'user' &&
          (message.content ?? '').includes(
            'Your previous reply was not a valid JSON object',
          ),
      ),
    ).toBe(true);
    // Cost covers both calls: first (1000 prompt + 100 completion) +
    // template (1000 + 500) at the pinned R1 prices.
    expect(scenario?.llm.totalCostUsd).toBeCloseTo(0.0025136, 6);
  });

  it('still records a parse-error after the retry also fails (two calls, not a crash)', async () => {
    const client = stubClient({
      content: 'this is not JSON at all',
      toolCalls: [],
      model: 'deepseek/deepseek-r1-0528',
      usage: null,
    });
    const report = await runEval({
      client,
      scenarioIds: ['healthy-saver'],
      repeats: 1,
      mock: [],
    });
    const [scenario] = report.scenarios;
    expect(client.calls).toHaveLength(2);
    expect(scenario?.llm.runs[0]?.status).toBe('parse-error');
    expect(scenario?.llm.grounding?.answerRate).toBe(0);
  });

  it('retries a 429 once and recovers', async () => {
    const client = sequenceClient([
      new LlmProviderError('The AI provider returned an error.', 429),
      templateCompletionFor('healthy-saver'),
    ]);
    const report = await runEval({
      client,
      scenarioIds: ['healthy-saver'],
      repeats: 1,
      mock: [],
    });
    const [scenario] = report.scenarios;
    expect(client.calls).toHaveLength(2);
    expect(scenario?.llm.runs[0]?.status).toBe('ok');
  }, 10_000);

  it('retries timeouts with backoff and recovers', async () => {
    const client = sequenceClient([
      new LlmProviderError(
        'The AI provider took too long to respond.',
        undefined,
        true,
      ),
      new LlmProviderError(
        'The AI provider took too long to respond.',
        undefined,
        true,
      ),
      templateCompletionFor('healthy-saver'),
    ]);
    const report = await runEval({
      client,
      scenarioIds: ['healthy-saver'],
      repeats: 1,
      mock: [],
    });
    const [scenario] = report.scenarios;
    expect(client.calls).toHaveLength(3);
    expect(scenario?.llm.runs[0]?.status).toBe('ok');
  }, 15_000);

  it('fails fast on a 401 (no retries) and records the HTTP status', async () => {
    const client = stubClient(
      new LlmProviderError('The AI provider returned an error.', 401),
    );
    const report = await runEval({
      client,
      scenarioIds: ['healthy-saver'],
      repeats: 1,
      mock: [],
    });
    const [scenario] = report.scenarios;
    expect(client.calls).toHaveLength(1);
    expect(scenario?.llm.runs[0]?.status).toBe('provider-error');
    expect(scenario?.llm.runs[0]?.error).toContain('HTTP 401');
  });
});

describe('renderReportMarkdown', () => {
  it('renders the results table with pending-key labels, never fabricated numbers', async () => {
    const report = await runEval({
      client: null,
      scenarioIds: ['healthy-saver', 'no-data'],
    });
    const markdown = renderReportMarkdown(report);
    expect(markdown).toContain('# FinVerse AI — Phase 5 Evaluation Results');
    expect(markdown).toContain('Template baseline');
    expect(markdown).toContain('LLM (reasoning model)');
    expect(markdown).toContain('pending key');
    expect(markdown).toContain('Mock rows exercise the runner mechanics only');
    expect(markdown).toContain('Healthy saver (healthy-saver)');
    expect(markdown).toContain('n/a (no score)');
    expect(markdown).toContain('## Pending');
    expect(markdown).toContain('OPENROUTER_API_KEY');
  });

  it('labels a key-present all-failed run "no successful runs", never "pending key" (24 Nov 2026 live run)', async () => {
    const client = stubClient(
      new LlmProviderError('The AI provider returned an error.', 429),
    );
    const report = await runEval({
      client,
      scenarioIds: ['healthy-saver'],
      repeats: 1,
      mock: [],
    });
    expect(report.keyPresent).toBe(true);
    const markdown = renderReportMarkdown(report);
    expect(markdown).toContain('no successful runs');
    expect(markdown).not.toContain('pending key');
  }, 15_000);

  it('shows $0.0000 — not "no model calls" — when a free model ran (24 Nov 2026: ERNIE :free, 45 calls, $0)', async () => {
    const client = stubClient(templateCompletionFor('healthy-saver'));
    const report = await runEval({
      client,
      scenarioIds: ['healthy-saver'],
      repeats: 1,
      mock: [],
    });
    // Simulate the free model: the runs happened, the price is zero.
    report.totalCostUsd.llm = 0;
    const markdown = renderReportMarkdown(report);
    expect(markdown).toContain('$0.0000');
    expect(markdown).not.toContain('$0 (no model calls)');
  }, 15_000);
});

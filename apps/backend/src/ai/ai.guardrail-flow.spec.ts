import { ConfigService } from '@nestjs/config';
import type { RagIngestService } from '../rag/rag.ingest';
import type { RagRetrievalService } from '../rag/rag.retrieval';
import type { RagService } from '../rag/rag.service';
import type { GuardrailCheckRow, GuardrailContext } from './ai.guardrail';
import type { GuardrailCheckRepository } from './ai.guardrail.repository';
import { GuardrailService } from './ai.guardrail.service';
import type { ChatCompletion, ChatOptions, LlmClient } from './ai.provider';
import { AiService } from './ai.service';
import type { AiTools } from './ai.tools';

/**
 * The Phase 3 flow tests: the REAL guardrail (engine + service) wired
 * into the AI service, with an in-memory check log in place of the
 * database. The corrupted answers here are deliberate — a wrong amount,
 * a citation of a tool never called — and the flow must catch them,
 * retry once, and fall back to the template rather than ever returning
 * an unverified claim.
 */

const USER_ID = 'user-123';

const BUDGET_STATUS = {
  available: true,
  month: '2026-11',
  monthlyIncome: 60000,
  categories: [
    {
      name: 'Food & Dining',
      budgeted: 10000,
      spent: 8600,
      remaining: 1400,
      overBudget: false,
    },
    {
      name: 'Transport',
      budgeted: 5000,
      spent: 4200,
      remaining: 800,
      overBudget: false,
    },
  ],
  totalBudgeted: 15000,
  totalSpent: 12800,
  totalRemaining: 2200,
};

const FUNDAMENTALS = {
  symbol: 'RELIANCE.NS',
  name: 'Reliance Industries',
  price: 2600,
  previousClose: 2580,
  change: 20,
  changePercent: 0.78,
  currency: 'INR',
  sector: 'Energy',
  fetchedAt: '2026-11-21T10:00:00Z',
  stale: false,
  fundamentals: {
    sector: 'Energy',
    industry: 'Oil & Gas',
    marketCap: 17_600_000_000_000,
    trailingPE: 25.4,
    forwardPE: 22.1,
    dividendYield: 0.35,
    fiftyTwoWeekHigh: 3210,
    fiftyTwoWeekLow: 2440.15,
    description: 'Reliance Industries Limited.',
  },
  fundamentalsAvailable: true,
  technicals: null,
};

function answerJson(answer: string, claims: unknown[]): string {
  return JSON.stringify({
    answer,
    claims,
    refused: false,
    refusalReason: null,
  });
}

/** A wrong amount: the tool says ₹12,800, the model says ₹99,999. */
const CORRUPTED_BUDGET_JSON = answerJson('You spent ₹99,999 this month.', [
  {
    text: 'You spent ₹99,999 of your budget.',
    source: { tool: 'getBudgetStatus', values: { totalSpent: 99999 } },
  },
]);

const CORRECTED_BUDGET_JSON = answerJson(
  'You spent ₹12,800 of your ₹15,000 budget.',
  [
    {
      text: 'You spent ₹12,800 of ₹15,000 budgeted.',
      source: {
        tool: 'getBudgetStatus',
        values: { totalSpent: 12800, totalBudgeted: 15000 },
      },
    },
  ],
);

const REFUSAL_JSON = JSON.stringify({
  answer: 'I cannot predict what a stock will do tomorrow.',
  claims: [],
  refused: true,
  refusalReason: 'I cannot predict what a stock will do tomorrow.',
});

const EXPLAIN_JSON = answerJson('RELIANCE.NS is trading at ₹2,600.00.', [
  {
    text: 'The price is ₹2,600.00.',
    source: { tool: 'getStockFundamentals', values: { price: 2600 } },
  },
]);

interface LoggedCheck {
  context: GuardrailContext;
  check: GuardrailCheckRow;
  attempt: number;
}

class InMemoryGuardrailCheckRepository {
  rows: LoggedCheck[] = [];

  async logChecks(
    context: GuardrailContext,
    checks: GuardrailCheckRow[],
    attempt: number,
  ): Promise<void> {
    for (const check of checks) {
      this.rows.push({ context, check, attempt });
    }
  }
}

function scriptedClient(responses: Array<ChatCompletion | Error>): {
  client: LlmClient;
  calls: ChatOptions[];
} {
  const calls: ChatOptions[] = [];
  const queue = [...responses];
  const client: LlmClient = {
    chat: jest.fn(async (request: ChatOptions) => {
      calls.push(request);
      const next = queue.shift();
      if (next instanceof Error) throw next;
      return next ?? { content: null, toolCalls: [], model: 'test-model' };
    }),
  };
  return { client, calls };
}

function toolCallCompletion(name: string, args: unknown): ChatCompletion {
  return {
    content: null,
    toolCalls: [{ id: 'call_1', name, arguments: JSON.stringify(args) }],
    model: 'test-model',
  };
}

function contentCompletion(content: string): ChatCompletion {
  return { content, toolCalls: [], model: 'test-model' };
}

function makeService(
  client: LlmClient,
  repository: InMemoryGuardrailCheckRepository,
  toolsResult: unknown,
) {
  const env: Record<string, string> = {
    OPENROUTER_API_KEY: 'test-key',
    LLM_MODEL_PRIMARY: 'qwen/qwen-2.5-72b-instruct',
    LLM_MODEL_REASONING: 'deepseek/deepseek-r1-0528',
  };
  const config = { get: (key: string) => env[key] } as unknown as ConfigService;
  const tools = {
    execute: jest.fn().mockResolvedValue(toolsResult),
  } as unknown as AiTools;
  const retrieval = {
    retrieve: jest.fn().mockResolvedValue({
      available: false,
      chunks: [],
      reason: 'Retrieval is unavailable right now.',
    }),
  } as unknown as RagRetrievalService;
  const ingest = {
    ensureProfileIndexed: jest.fn().mockResolvedValue(undefined),
    indexNews: jest.fn().mockResolvedValue({
      indexed: 0,
      skipped: 0,
      available: true,
      reason: null,
    }),
  } as unknown as RagIngestService;
  const rag = {
    newsForSymbol: jest.fn(),
    screen: jest.fn(),
  } as unknown as RagService;
  const guardrail = new GuardrailService(
    repository as unknown as GuardrailCheckRepository,
  );
  const service = new AiService(
    config,
    tools,
    client,
    retrieval,
    ingest,
    rag,
    guardrail,
  );
  return service;
}

describe('AiService guardrail flow', () => {
  it('retries once with a correction prompt and returns the verified answer', async () => {
    const repository = new InMemoryGuardrailCheckRepository();
    const { client, calls } = scriptedClient([
      toolCallCompletion('getBudgetStatus', { month: '2026-11' }),
      contentCompletion('thinking'),
      contentCompletion(CORRUPTED_BUDGET_JSON),
      contentCompletion(CORRECTED_BUDGET_JSON),
    ]);
    const service = makeService(client, repository, BUDGET_STATUS);
    const response = await service.chat(USER_ID, {
      message: 'How much did I spend this month?',
    });
    expect(response.answer).toContain('₹12,800');
    expect(response.answer).not.toContain('₹99,999');
    expect(response.verification.status).toBe('verified');
    expect(response.verification.checksFailed).toBe(0);
    expect(response.verification.checksPassed).toBeGreaterThan(0);
    expect(response.model).toBe('qwen/qwen-2.5-72b-instruct');
    // The retry carried the correction: the failed claim and the
    // correct value.
    const retryCall = calls[3];
    const retryContent = retryCall.messages
      .map((message) => message.content ?? '')
      .join('\n');
    expect(retryContent).toContain('99,999');
    expect(retryContent).toContain('12800');
    // Both attempts were logged, attempt 1 with a failure.
    const attempt1 = repository.rows.filter((row) => row.attempt === 1);
    const attempt2 = repository.rows.filter((row) => row.attempt === 2);
    expect(attempt1.some((row) => !row.check.passed)).toBe(true);
    expect(attempt2.length).toBeGreaterThan(0);
    expect(attempt2.every((row) => row.check.passed)).toBe(true);
    expect(attempt1[0]?.context.feature).toBe('chat');
  });

  it('falls back to the template when the retry still fails — never the unverified text', async () => {
    const repository = new InMemoryGuardrailCheckRepository();
    const { client, calls } = scriptedClient([
      toolCallCompletion('getBudgetStatus', { month: '2026-11' }),
      contentCompletion('thinking'),
      contentCompletion(CORRUPTED_BUDGET_JSON),
      contentCompletion(CORRUPTED_BUDGET_JSON),
    ]);
    const service = makeService(client, repository, BUDGET_STATUS);
    const response = await service.chat(USER_ID, {
      message: 'How much did I spend this month?',
    });
    expect(response.answer).not.toContain('₹99,999');
    expect(response.answer).toContain('₹12,800 spent of ₹15,000 budgeted');
    expect(response.verification.status).toBe('template');
    expect(response.verification.checksFailed).toBeGreaterThan(0);
    expect(response.model).toBeNull();
    expect(response.fallback).toBe(false);
    // Exactly one guardrail retry: no infinite loop.
    expect(calls).toHaveLength(4);
    const attempt2 = repository.rows.filter((row) => row.attempt === 2);
    expect(attempt2.some((row) => !row.check.passed)).toBe(true);
  });

  it('skips verification entirely for refusals', async () => {
    const repository = new InMemoryGuardrailCheckRepository();
    const { client } = scriptedClient([
      toolCallCompletion('getBudgetStatus', { month: '2026-11' }),
      contentCompletion('thinking'),
      contentCompletion(REFUSAL_JSON),
    ]);
    const service = makeService(client, repository, BUDGET_STATUS);
    const response = await service.chat(USER_ID, {
      message: 'What will RELIANCE do tomorrow?',
    });
    expect(response.refused).toBe(true);
    expect(response.verification.status).toBe('refused');
    expect(repository.rows).toHaveLength(0);
  });

  it('verifies an explain-stock answer against the computed figures', async () => {
    const repository = new InMemoryGuardrailCheckRepository();
    const { client } = scriptedClient([contentCompletion(EXPLAIN_JSON)]);
    const service = makeService(client, repository, FUNDAMENTALS);
    const response = await service.explainStock(USER_ID, {
      symbol: 'RELIANCE.NS',
    });
    expect(response.verification.status).toBe('verified');
    expect(response.verification.checksPassed).toBeGreaterThan(0);
    expect(repository.rows.length).toBeGreaterThan(0);
    expect(repository.rows[0]?.context.feature).toBe('explain-stock');
    expect(repository.rows.every((row) => row.check.passed)).toBe(true);
  });

  it('a citation of a tool never called fails and reaches the template', async () => {
    const repository = new InMemoryGuardrailCheckRepository();
    const fakeCitation = answerJson('Your portfolio is worth ₹5,00,000.', [
      {
        text: 'Your portfolio is worth ₹5,00,000.',
        source: {
          tool: 'getPortfolioSummary',
          values: { totalValue: 500000 },
        },
      },
    ]);
    const { client } = scriptedClient([
      toolCallCompletion('getBudgetStatus', { month: '2026-11' }),
      contentCompletion('thinking'),
      contentCompletion(fakeCitation),
      contentCompletion(fakeCitation),
    ]);
    const service = makeService(client, repository, BUDGET_STATUS);
    const response = await service.chat(USER_ID, {
      message: 'How much is my portfolio worth?',
    });
    expect(response.answer).not.toContain('₹5,00,000');
    expect(response.verification.status).toBe('template');
    const failures = repository.rows.filter((row) => !row.check.passed);
    expect(failures.some((row) => row.check.checkType === 'source')).toBe(true);
  });
});

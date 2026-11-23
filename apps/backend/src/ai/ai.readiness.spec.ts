import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RagIngestService } from '../rag/rag.ingest';
import type { RagRetrievalService } from '../rag/rag.retrieval';
import type { RagService } from '../rag/rag.service';
import {
  scoreReadiness,
  type ReadinessAssessment,
} from '../readiness/readiness.formula';
import type { GuardrailCheckRow, GuardrailContext } from './ai.guardrail';
import type { GuardrailCheckRepository } from './ai.guardrail.repository';
import { GuardrailService } from './ai.guardrail.service';
import type { ChatCompletion, ChatOptions, LlmClient } from './ai.provider';
import { AiService } from './ai.service';
import type { AiTools } from './ai.tools';

/**
 * The Phase 4 flow tests: the REAL guardrail wired into the AI service,
 * with an in-memory check log in place of the database. The assessment
 * fixture is computed by the real formula, so the scripted model
 * answers are checked against the numbers the formula actually
 * produces. A corrupted explanation must be caught, retried once, and
 * fall back to the template rather than ever returning an unverified
 * claim about the user's score.
 */

const USER_ID = 'user-123';
const REASONING = 'deepseek/deepseek-r1-0528';

function midAssessment(): ReadinessAssessment {
  const result = scoreReadiness({
    emergencyFundBand: '3-6',
    monthlyIncome: 50000,
    monthlyExpenses: 40000,
    totalDebt: 120000,
    holdings: [
      { symbol: 'RELIANCE.NS', currentValue: 50000 },
      { symbol: 'TCS.NS', currentValue: 50000 },
    ],
    holdingVolatilities: [
      { symbol: 'RELIANCE.NS', volatility: 0.3, currentValue: 50000 },
      { symbol: 'TCS.NS', volatility: 0.3, currentValue: 50000 },
    ],
  });
  if (!result.available) throw new Error('expected an available assessment');
  return result;
}

function answerJson(answer: string, claims: unknown[]): string {
  return JSON.stringify({
    answer,
    claims,
    refused: false,
    refusalReason: null,
  });
}

const CLEAN_CLAIMS = [
  {
    text: 'Your readiness score is 71 out of 100 (Ready).',
    source: { tool: 'getReadinessScore', values: { score: 71, scale: 100 } },
  },
  {
    text: 'Your emergency fund covers 4.5 months, worth 18.8 of 25 points.',
    source: {
      tool: 'getReadinessScore',
      values: {
        name: 'Emergency fund',
        months: 4.5,
        points: 18.8,
        maxPoints: 25,
      },
    },
  },
  {
    text: 'Your monthly surplus is ₹10,000 (20% of income), worth 16.7 of 25 points.',
    source: {
      tool: 'getReadinessScore',
      values: {
        name: 'Monthly surplus',
        surplus: 10000,
        surplusRatePercent: 20,
        points: 16.7,
        maxPoints: 25,
      },
    },
  },
  {
    text: 'Raise your monthly surplus to ₹15,000 a month (30% of income) — about 8.3 points.',
    source: {
      tool: 'getReadinessScore',
      values: { targetSurplus: 15000, targetRatePercent: 30, pointsGain: 8.3 },
    },
  },
];

const CLEAN_JSON = answerJson(
  CLEAN_CLAIMS.map((claim) => claim.text).join(' '),
  CLEAN_CLAIMS,
);

/** A wrong score: the assessment says 71, the model says 85. */
const CORRUPTED_SCORE_JSON = answerJson(
  'Your readiness score is 85 out of 100 (Ready).',
  [
    {
      text: 'Your readiness score is 85 out of 100 (Ready).',
      source: { tool: 'getReadinessScore', values: { score: 85, scale: 100 } },
    },
  ],
);

/** A wrong amount: the surplus is ₹10,000, the model says ₹99,999. */
const CORRUPTED_SURPLUS_JSON = answerJson('Your monthly surplus is ₹99,999.', [
  {
    text: 'Your monthly surplus is ₹99,999.',
    source: {
      tool: 'getReadinessScore',
      values: { name: 'Monthly surplus', surplus: 99999 },
    },
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

function contentCompletion(content: string): ChatCompletion {
  return { content, toolCalls: [], model: 'test-model' };
}

function makeService(
  client: LlmClient,
  repository: InMemoryGuardrailCheckRepository,
  toolsResult: unknown,
  env: Record<string, string> = {
    OPENROUTER_API_KEY: 'test-key',
    LLM_MODEL_PRIMARY: 'qwen/qwen-2.5-72b-instruct',
    LLM_MODEL_REASONING: REASONING,
  },
) {
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
  return new AiService(
    config,
    tools,
    client,
    retrieval,
    ingest,
    rag,
    guardrail,
  );
}

describe('AiService explainReadiness', () => {
  it('returns a verified explanation from the reasoning model', async () => {
    const repository = new InMemoryGuardrailCheckRepository();
    const { client, calls } = scriptedClient([contentCompletion(CLEAN_JSON)]);
    const service = makeService(client, repository, midAssessment());
    const response = await service.explainReadiness(USER_ID, {});
    expect(response.verification.status).toBe('verified');
    expect(response.verification.checksFailed).toBe(0);
    expect(response.model).toBe(REASONING);
    expect(response.toolsUsed).toEqual(['getReadinessScore']);
    expect(response.answer).toContain('71 out of 100');
    expect(response.answer).toContain('4.5 months');
    expect(response.answer).toContain('₹15,000');
    expect(response.fallback).toBe(false);
    expect(response.refused).toBe(false);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.model).toBe(REASONING);
    // The guardrail logged the checks for the explain-readiness feature.
    expect(repository.rows.length).toBeGreaterThan(0);
    expect(repository.rows[0]?.context.feature).toBe('explain-readiness');
  });

  it('caches the explanation: a second call makes no model call', async () => {
    const repository = new InMemoryGuardrailCheckRepository();
    const { client, calls } = scriptedClient([contentCompletion(CLEAN_JSON)]);
    const service = makeService(client, repository, midAssessment());
    await service.explainReadiness(USER_ID, {});
    const second = await service.explainReadiness(USER_ID, {});
    expect(second.answer).toContain('71 out of 100');
    expect(calls).toHaveLength(1);
  });

  it('retries a corrupted score and returns the corrected explanation', async () => {
    const repository = new InMemoryGuardrailCheckRepository();
    const { client, calls } = scriptedClient([
      contentCompletion(CORRUPTED_SCORE_JSON),
      contentCompletion(CLEAN_JSON),
    ]);
    const service = makeService(client, repository, midAssessment());
    const response = await service.explainReadiness(USER_ID, {});
    expect(response.verification.status).toBe('verified');
    expect(response.answer).toContain('71 out of 100');
    expect(response.answer).not.toContain('85 out of 100');
    expect(calls).toHaveLength(2);
    expect(repository.rows.some((row) => row.attempt === 2)).toBe(true);
  });

  it('falls back to the template when both attempts are corrupted', async () => {
    const repository = new InMemoryGuardrailCheckRepository();
    const { client, calls } = scriptedClient([
      contentCompletion(CORRUPTED_SCORE_JSON),
      contentCompletion(CORRUPTED_SURPLUS_JSON),
    ]);
    const service = makeService(client, repository, midAssessment());
    const response = await service.explainReadiness(USER_ID, {});
    expect(response.verification.status).toBe('template');
    expect(response.model).toBeNull();
    // The template is built only from verified numbers.
    expect(response.answer).toContain('71 out of 100');
    expect(response.answer).toContain('4.5 months');
    expect(response.answer).toContain('₹10,000');
    expect(response.answer).toContain('₹15,000');
    expect(response.answer).not.toContain('85 out of 100');
    expect(response.answer).not.toContain('₹99,999');
    expect(calls).toHaveLength(2);
  });

  it('refuses honestly without a model call when the score is unavailable', async () => {
    const repository = new InMemoryGuardrailCheckRepository();
    const { client, calls } = scriptedClient([]);
    const service = makeService(client, repository, {
      available: false,
      reason: 'Complete your financial profile to see your score.',
      missing: ['financial profile'],
    });
    const response = await service.explainReadiness(USER_ID, {});
    expect(response.refused).toBe(true);
    expect(response.refusalReason).toBe(
      'Complete your financial profile to see your score.',
    );
    expect(response.verification.status).toBe('refused');
    expect(calls).toHaveLength(0);
  });

  it('falls back to the raw score when no API key is configured', async () => {
    const repository = new InMemoryGuardrailCheckRepository();
    const { client, calls } = scriptedClient([]);
    const service = makeService(client, repository, midAssessment(), {
      LLM_MODEL_PRIMARY: 'qwen/qwen-2.5-72b-instruct',
      LLM_MODEL_REASONING: REASONING,
    });
    const response = await service.explainReadiness(USER_ID, {});
    expect(response.fallback).toBe(true);
    expect(response.answer).toBeNull();
    expect(response.verification.status).toBe('unavailable');
    expect(
      (response.metrics as { assessment: ReadinessAssessment }).assessment
        .score,
    ).toBe(71);
    expect(calls).toHaveLength(0);
  });

  it('rejects an over-long question', async () => {
    const repository = new InMemoryGuardrailCheckRepository();
    const { client } = scriptedClient([]);
    const service = makeService(client, repository, midAssessment());
    await expect(
      service.explainReadiness(USER_ID, { question: 'x'.repeat(501) }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

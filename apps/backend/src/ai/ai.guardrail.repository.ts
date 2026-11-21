import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  GuardrailCheckRow,
  GuardrailContext,
  GuardrailFeature,
} from './ai.guardrail';

/**
 * The guardrail check log (Phase 3): every check the guardrail runs is
 * persisted here, pass or fail, so Phase 5 can compute the guardrail
 * pass rate — the factual-grounding metric — from this table.
 *
 * Unlike the RAG store, this table has no vector column, so the typed
 * Prisma client works directly.
 */

export interface GuardrailPassRate {
  total: number;
  passed: number;
  failed: number;
  /** Null when no checks have been logged yet. */
  rate: number | null;
}

@Injectable()
export class GuardrailCheckRepository {
  constructor(private readonly prisma: PrismaService) {}

  async logChecks(
    context: GuardrailContext,
    checks: GuardrailCheckRow[],
    attempt: number,
  ): Promise<void> {
    if (checks.length === 0) return;
    await this.prisma.guardrailCheck.createMany({
      data: checks.map((check) => ({
        request_id: context.requestId,
        user_id: context.userId,
        feature: context.feature,
        attempt,
        claim_text: check.claimText,
        source_tool: check.sourceTool,
        check_type: check.checkType,
        expected: check.expected,
        actual: check.actual,
        verdict: check.passed ? 'pass' : 'fail',
      })),
    });
  }

  /**
   * The guardrail pass rate, overall or for one feature. Phase 5
   * queries this for the factual-grounding metric.
   */
  async passRate(feature?: GuardrailFeature): Promise<GuardrailPassRate> {
    const where = feature === undefined ? {} : { feature };
    const [total, passed] = await Promise.all([
      this.prisma.guardrailCheck.count({ where }),
      this.prisma.guardrailCheck.count({
        where: { ...where, verdict: 'pass' },
      }),
    ]);
    return {
      total,
      passed,
      failed: total - passed,
      rate: total === 0 ? null : passed / total,
    };
  }
}

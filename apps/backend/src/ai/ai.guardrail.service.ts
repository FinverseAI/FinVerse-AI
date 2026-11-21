import { Injectable, Logger } from '@nestjs/common';
import {
  verifyAnswer,
  type GuardrailContext,
  type GuardrailResult,
} from './ai.guardrail';
import { GuardrailCheckRepository } from './ai.guardrail.repository';
import type { AiAnswer } from './ai.validation';

/**
 * The guardrail service: the injectable seam between the AI service
 * and the pure verification engine. It verifies an answer and persists
 * the check log.
 *
 * Logging is fail-open: a database outage must never fail an answer
 * the guardrail already verified (or already rejected) — the check
 * rows are metrics, not the verdict. A failed write is logged as a
 * warning so a metrics gap is visible instead of silent.
 */
@Injectable()
export class GuardrailService {
  private readonly logger = new Logger(GuardrailService.name);

  constructor(private readonly repository: GuardrailCheckRepository) {}

  async verify(
    answer: AiAnswer,
    context: GuardrailContext,
    attempt: number,
  ): Promise<GuardrailResult> {
    const result = verifyAnswer(answer, context);
    try {
      await this.repository.logChecks(context, result.checks, attempt);
    } catch (error) {
      this.logger.warn(
        `Failed to log ${result.checks.length} guardrail checks for request ${context.requestId}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
    return result;
  }
}

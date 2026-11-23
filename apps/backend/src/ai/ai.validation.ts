import { z } from 'zod';

/**
 * Request validation and the structured-output schema for the LLM.
 * The answer schema is the contract the model must meet: claims separated
 * from evidence, every claim carrying the tool and values it cites, and
 * refusals as a first-class shape instead of free text.
 */

export const ChatRequestSchema = z.object({
  message: z.string().trim().min(1).max(2000),
});

export const ExplainStockRequestSchema = z.object({
  symbol: z.string().trim().min(1).max(20),
  question: z.string().trim().max(500).optional(),
});

export const ExplainNewsRequestSchema = z.object({
  symbol: z.string().trim().min(1).max(20),
  question: z.string().trim().max(500).optional(),
});

export const ExplainReadinessRequestSchema = z.object({
  question: z.string().trim().max(500).optional(),
});

export const ScreenQueryRequestSchema = z.object({
  query: z.string().trim().min(1).max(500),
});

export const SearchKnowledgeArgsSchema = z.object({
  query: z.string().trim().min(1).max(500),
  symbol: z.string().trim().min(1).max(20).optional(),
});

export const GetStockQuoteArgsSchema = z.object({
  symbol: z.string().trim().min(1).max(20),
});

export const GetStockFundamentalsArgsSchema = z.object({
  symbol: z.string().trim().min(1).max(20),
});

export const GetTransactionsArgsSchema = z.object({
  category: z.string().trim().min(1).max(40).optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

export const GetBudgetStatusArgsSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});

export const GetCategorySpendingArgsSchema = z.object({
  category: z.string().trim().min(1).max(40),
  period: z.enum(['week', 'month', '3months']).optional(),
});

/**
 * The shared structured-extraction schema for expense entry (strategy doc
 * §3.3): natural-language, voice, and receipt inputs all funnel through
 * ONE pipeline with this shape — amount, category, date, merchant — and
 * the user confirms before anything is committed. It is defined here so
 * the extraction pipeline can reuse the same JSON-mode capability as the
 * chat answers; no endpoint uses it yet (entry UI is out of Phase 1).
 */
export const ExpenseExtractionSchema = z.object({
  amount: z.number().positive().finite(),
  category: z.string().trim().min(1).max(40),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  merchant: z.string().trim().max(120).nullable(),
});

export type ExpenseExtraction = z.infer<typeof ExpenseExtractionSchema>;

/**
 * Parse one structured JSON reply from the model: strip markdown fences
 * defensively, parse the JSON, validate against the schema. Shared by the
 * answer pipeline now and the extraction pipeline later, so both get the
 * same parse-then-validate behaviour.
 */
export function parseStructuredJson<T>(
  raw: string | null,
  schema: z.ZodType<T>,
): { ok: true; value: T } | { ok: false; error: string } {
  if (raw === null || !raw.trim()) {
    return { ok: false, error: 'The model returned an empty reply.' };
  }
  let text = raw.trim();
  if (text.startsWith('```')) {
    text = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'The model reply was not valid JSON.' };
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      error: `The model reply did not match the required shape: ${firstIssueMessage(result.error)}`,
    };
  }
  return { ok: true, value: result.data };
}

const AiClaimSourceSchema = z.object({
  tool: z.string().min(1),
  values: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean(), z.null()]),
  ),
});

const AiClaimSchema = z.object({
  text: z.string().min(1),
  source: AiClaimSourceSchema,
});

export const AiAnswerSchema = z
  .object({
    answer: z.string().min(1),
    claims: z.array(AiClaimSchema),
    refused: z.boolean(),
    refusalReason: z.string().nullable().optional(),
  })
  .superRefine((value, context) => {
    if (value.refused) {
      if (value.claims.length > 0) {
        context.addIssue({
          code: 'custom',
          message: 'A refused answer must not carry claims.',
        });
      }
      if (!value.refusalReason || !value.refusalReason.trim()) {
        context.addIssue({
          code: 'custom',
          message: 'A refused answer must carry a refusal reason.',
        });
      }
    } else if (value.claims.length === 0) {
      context.addIssue({
        code: 'custom',
        message: 'An answer must cite at least one claim from the tools.',
      });
    }
  });

export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ExplainStockRequest = z.infer<typeof ExplainStockRequestSchema>;
export type ExplainNewsRequest = z.infer<typeof ExplainNewsRequestSchema>;
export type ExplainReadinessRequest = z.infer<
  typeof ExplainReadinessRequestSchema
>;
export type ScreenQueryRequest = z.infer<typeof ScreenQueryRequestSchema>;
export type AiAnswer = z.infer<typeof AiAnswerSchema>;
export type AiClaim = z.infer<typeof AiClaimSchema>;

/** The first readable message from a Zod failure, for 400 responses. */
export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'The request was invalid.';
}

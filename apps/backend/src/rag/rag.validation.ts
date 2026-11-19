import { z } from 'zod';

/**
 * Request validation for the RAG features. The screener filters are the
 * same shape the NL screener tool produces (Phase 2, strategy doc §3.1),
 * so a manually configured screen and an LLM-translated one execute
 * through exactly the same code path.
 *
 * Units: prices in ₹, market cap in ₹ crore, RSI 0–100, changes in %.
 * A filter on a metric a symbol does not have excludes that symbol —
 * the screen never pretends a missing number passed a filter.
 */

export const SCREENER_TRENDS = [
  'above-sma20',
  'below-sma20',
  'above-sma50',
  'below-sma50',
  'golden-cross',
  'death-cross',
] as const;

export type ScreenerTrend = (typeof SCREENER_TRENDS)[number];

const symbolPattern = /^[A-Z0-9.^=-]{1,20}$/;

export const ScreenFiltersSchema = z
  .object({
    symbols: z
      .array(
        z
          .string()
          .trim()
          .max(20)
          .transform((value) => value.toUpperCase())
          .refine((value) => symbolPattern.test(value), {
            message: 'Enter valid symbols.',
          }),
      )
      .max(20, 'Screen at most 20 symbols at a time.')
      .optional(),
    minPrice: z.number().finite().min(0).optional(),
    maxPrice: z.number().finite().min(0).optional(),
    minMarketCapCr: z.number().finite().min(0).optional(),
    maxMarketCapCr: z.number().finite().min(0).optional(),
    minRsi: z.number().finite().min(0).max(100).optional(),
    maxRsi: z.number().finite().min(0).max(100).optional(),
    minPe: z.number().finite().min(0).optional(),
    maxPe: z.number().finite().min(0).optional(),
    minChange1mo: z.number().finite().min(-100).max(1000).optional(),
    maxChange1mo: z.number().finite().min(-100).max(1000).optional(),
    trend: z.enum(SCREENER_TRENDS).optional(),
    sector: z.string().trim().min(1).max(80).optional(),
    limit: z.number().int().min(1).max(50).optional(),
  })
  .superRefine((value, context) => {
    const pairs: Array<[number | undefined, number | undefined, string]> = [
      [value.minPrice, value.maxPrice, 'price'],
      [value.minMarketCapCr, value.maxMarketCapCr, 'market cap'],
      [value.minRsi, value.maxRsi, 'RSI'],
      [value.minPe, value.maxPe, 'P/E'],
      [value.minChange1mo, value.maxChange1mo, '1-month change'],
    ];
    for (const [min, max, label] of pairs) {
      if (min !== undefined && max !== undefined && min > max) {
        context.addIssue({
          code: 'custom',
          message: `The minimum ${label} must not exceed the maximum.`,
        });
      }
    }
  });

export type ScreenFilters = z.infer<typeof ScreenFiltersSchema>;

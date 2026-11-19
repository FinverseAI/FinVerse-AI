import {
  AiAnswerSchema,
  ChatRequestSchema,
  ExpenseExtractionSchema,
  ExplainStockRequestSchema,
  GetBudgetStatusArgsSchema,
  GetCategorySpendingArgsSchema,
  GetTransactionsArgsSchema,
  parseStructuredJson,
} from './ai.validation';

describe('ai validation', () => {
  describe('ChatRequestSchema', () => {
    it('accepts a trimmed message', () => {
      expect(ChatRequestSchema.parse({ message: '  hello  ' })).toEqual({
        message: 'hello',
      });
    });

    it('rejects empty and over-long messages', () => {
      expect(ChatRequestSchema.safeParse({ message: '   ' }).success).toBe(
        false,
      );
      expect(
        ChatRequestSchema.safeParse({ message: 'x'.repeat(2001) }).success,
      ).toBe(false);
      expect(ChatRequestSchema.safeParse({}).success).toBe(false);
    });
  });

  describe('ExplainStockRequestSchema', () => {
    it('trims the symbol and accepts an optional question', () => {
      // Upper-casing is normalizeSymbol's job in the service layer.
      expect(
        ExplainStockRequestSchema.parse({
          symbol: ' reliance ',
          question: 'why?',
        }),
      ).toEqual({ symbol: 'reliance', question: 'why?' });
    });

    it('rejects empty symbols and over-long questions', () => {
      expect(ExplainStockRequestSchema.safeParse({ symbol: '' }).success).toBe(
        false,
      );
      expect(
        ExplainStockRequestSchema.safeParse({
          symbol: 'RELIANCE',
          question: 'x'.repeat(501),
        }).success,
      ).toBe(false);
    });
  });

  describe('tool argument schemas', () => {
    it('clamps the transaction limit to 1..50', () => {
      expect(GetTransactionsArgsSchema.safeParse({ limit: 0 }).success).toBe(
        false,
      );
      expect(GetTransactionsArgsSchema.safeParse({ limit: 51 }).success).toBe(
        false,
      );
      expect(GetTransactionsArgsSchema.parse({ limit: 50 })).toEqual({
        limit: 50,
      });
    });

    it('requires a YYYY-MM month for budget status', () => {
      expect(
        GetBudgetStatusArgsSchema.safeParse({ month: '2026-1' }).success,
      ).toBe(false);
      expect(GetBudgetStatusArgsSchema.parse({ month: '2026-11' })).toEqual({
        month: '2026-11',
      });
    });

    it('accepts the three category-spending periods', () => {
      expect(
        GetCategorySpendingArgsSchema.parse({
          category: 'Food & Dining',
          period: '3months',
        }),
      ).toEqual({ category: 'Food & Dining', period: '3months' });
      expect(
        GetCategorySpendingArgsSchema.safeParse({
          category: 'Food',
          period: 'year',
        }).success,
      ).toBe(false);
    });
  });

  describe('AiAnswerSchema', () => {
    const valid = {
      answer: 'You overspent because of dining out.',
      claims: [
        {
          text: 'You spent ₹8,200 on Food & Dining.',
          source: {
            tool: 'getCategorySpending',
            values: { category: 'Food & Dining', totalSpent: 8200 },
          },
        },
      ],
      refused: false,
      refusalReason: null,
    };

    it('accepts a well-formed answer', () => {
      expect(AiAnswerSchema.parse(valid)).toEqual(valid);
    });

    it('accepts a refusal with no claims', () => {
      // The refusal text lives in "answer" (see the structured-output
      // instructions); "refusalReason" is the one-sentence reason.
      const refusal = {
        answer: 'I cannot predict prices.',
        claims: [],
        refused: true,
        refusalReason: 'I cannot predict prices.',
      };
      expect(AiAnswerSchema.parse(refusal)).toEqual(refusal);
    });

    it('rejects a refusal that still carries claims', () => {
      const bad = { ...valid, refused: true, refusalReason: 'no' };
      expect(AiAnswerSchema.safeParse(bad).success).toBe(false);
    });

    it('rejects a refusal without a reason', () => {
      const bad = {
        answer: 'I cannot predict prices.',
        claims: [],
        refused: true,
        refusalReason: null,
      };
      expect(AiAnswerSchema.safeParse(bad).success).toBe(false);
    });

    it('rejects an answer with no claims', () => {
      const bad = { ...valid, claims: [] };
      expect(AiAnswerSchema.safeParse(bad).success).toBe(false);
    });

    it('rejects claims without a source tool', () => {
      const bad = {
        ...valid,
        claims: [
          { text: 'Something happened.', source: { tool: '', values: {} } },
        ],
      };
      expect(AiAnswerSchema.safeParse(bad).success).toBe(false);
    });
  });

  describe('ExpenseExtractionSchema', () => {
    it('accepts a complete extraction', () => {
      expect(
        ExpenseExtractionSchema.parse({
          amount: 250.5,
          category: 'Food & Dining',
          date: '2026-11-19',
          merchant: 'Swiggy',
        }),
      ).toEqual({
        amount: 250.5,
        category: 'Food & Dining',
        date: '2026-11-19',
        merchant: 'Swiggy',
      });
    });

    it('accepts unknown date and merchant as null', () => {
      expect(
        ExpenseExtractionSchema.parse({
          amount: 100,
          category: 'Transport',
          date: null,
          merchant: null,
        }),
      ).toEqual({
        amount: 100,
        category: 'Transport',
        date: null,
        merchant: null,
      });
    });

    it('rejects non-positive amounts and bad dates', () => {
      expect(
        ExpenseExtractionSchema.safeParse({
          amount: 0,
          category: 'Food',
          date: null,
          merchant: null,
        }).success,
      ).toBe(false);
      expect(
        ExpenseExtractionSchema.safeParse({
          amount: 100,
          category: 'Food',
          date: '19/11/2026',
          merchant: null,
        }).success,
      ).toBe(false);
    });
  });

  describe('parseStructuredJson', () => {
    it('parses plain JSON', () => {
      const result = parseStructuredJson('{"message":"hi"}', ChatRequestSchema);
      expect(result).toEqual({ ok: true, value: { message: 'hi' } });
    });

    it('strips markdown fences', () => {
      const result = parseStructuredJson(
        '```json\n{"message":"hi"}\n```',
        ChatRequestSchema,
      );
      expect(result).toEqual({ ok: true, value: { message: 'hi' } });
    });

    it('fails on empty, malformed, and wrong-shaped replies', () => {
      expect(parseStructuredJson(null, ChatRequestSchema).ok).toBe(false);
      expect(parseStructuredJson('  ', ChatRequestSchema).ok).toBe(false);
      expect(parseStructuredJson('not json', ChatRequestSchema).ok).toBe(false);
      expect(parseStructuredJson('{"other":1}', ChatRequestSchema).ok).toBe(
        false,
      );
    });
  });
});

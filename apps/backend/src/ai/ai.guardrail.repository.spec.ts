import { PrismaService } from '../prisma/prisma.service';
import type { GuardrailCheckRow } from './ai.guardrail';
import { GuardrailCheckRepository } from './ai.guardrail.repository';

function check(overrides: Partial<GuardrailCheckRow> = {}): GuardrailCheckRow {
  return {
    claimIndex: 0,
    claimText: 'You spent ₹8,200 on Food & Dining.',
    sourceTool: 'getCategorySpending',
    checkType: 'value',
    expected: '8200',
    actual: '8200',
    passed: true,
    detail: "'totalSpent' matches the tool result (8200).",
    ...overrides,
  };
}

describe('GuardrailCheckRepository', () => {
  function makeRepository() {
    const createMany = jest.fn().mockResolvedValue({ count: 2 });
    const count = jest.fn();
    const prisma = {
      guardrailCheck: { createMany, count },
    } as unknown as PrismaService;
    return {
      repository: new GuardrailCheckRepository(prisma),
      createMany,
      count,
    };
  }

  const context = {
    requestId: 'req-1',
    userId: 'user-123',
    feature: 'chat' as const,
    toolResults: new Map(),
    chunks: [],
  };

  describe('logChecks', () => {
    it('persists every check with its verdict', async () => {
      const { repository, createMany } = makeRepository();
      await repository.logChecks(
        context,
        [check(), check({ passed: false, actual: '9200' })],
        1,
      );
      expect(createMany).toHaveBeenCalledTimes(1);
      const data = createMany.mock.calls[0]?.[0]?.data as Array<
        Record<string, unknown>
      >;
      expect(data).toHaveLength(2);
      expect(data[0]).toMatchObject({
        request_id: 'req-1',
        user_id: 'user-123',
        feature: 'chat',
        attempt: 1,
        source_tool: 'getCategorySpending',
        check_type: 'value',
        expected: '8200',
        actual: '8200',
        verdict: 'pass',
      });
      expect(data[1]?.verdict).toBe('fail');
      expect(data[1]?.actual).toBe('9200');
    });

    it('skips the write when there are no checks', async () => {
      const { repository, createMany } = makeRepository();
      await repository.logChecks(context, [], 1);
      expect(createMany).not.toHaveBeenCalled();
    });
  });

  describe('passRate', () => {
    it('computes the pass rate from the log', async () => {
      const { repository, count } = makeRepository();
      count.mockResolvedValueOnce(10).mockResolvedValueOnce(8);
      await expect(repository.passRate()).resolves.toEqual({
        total: 10,
        passed: 8,
        failed: 2,
        rate: 0.8,
      });
      expect(count).toHaveBeenCalledWith({ where: {} });
      expect(count).toHaveBeenCalledWith({
        where: { verdict: 'pass' },
      });
    });

    it('scopes the pass rate to one feature', async () => {
      const { repository, count } = makeRepository();
      count.mockResolvedValueOnce(4).mockResolvedValueOnce(3);
      await expect(repository.passRate('explain-stock')).resolves.toEqual({
        total: 4,
        passed: 3,
        failed: 1,
        rate: 0.75,
      });
      expect(count).toHaveBeenCalledWith({
        where: { feature: 'explain-stock' },
      });
    });

    it('returns a null rate when nothing has been logged', async () => {
      const { repository, count } = makeRepository();
      count.mockResolvedValue(0);
      await expect(repository.passRate()).resolves.toEqual({
        total: 0,
        passed: 0,
        failed: 0,
        rate: null,
      });
    });
  });
});

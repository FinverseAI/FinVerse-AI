import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfileService } from './profile.service';

const input = {
  employment_type: 'salaried',
  monthly_income: '60000',
  fixed_expenses: '20000',
  variable_expenses: '10000',
  current_savings: '100000',
  monthly_savings_target: '10000',
  investment_experience: 'none',
  risk_tolerance: 'low',
  already_investing: false,
  emergency_fund_months: '0',
  goals: [
    {
      name: 'Home',
      target_amount: '1000000',
      target_date: '2030-01-01',
      priority: 'high',
    },
  ],
};

describe('ProfileService', () => {
  const tx = {
    $queryRaw: jest.fn(),
    userFinancialProfile: { findUnique: jest.fn(), upsert: jest.fn() },
    userGoal: { deleteMany: jest.fn(), createMany: jest.fn() },
    user: { findUnique: jest.fn() },
  };
  const transaction = jest.fn(
    async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
  );
  const service = new ProfileService({
    ...tx,
    $transaction: transaction,
  } as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
    tx.userFinancialProfile.findUnique.mockResolvedValue(null);
    tx.user.findUnique.mockResolvedValue(null);
    tx.userGoal.createMany.mockResolvedValue({ count: 1 });
  });

  it('returns an explicit incomplete state for a new user', async () => {
    await expect(service.get('new-user')).resolves.toEqual({
      profile: null,
      goals: [],
      onboarding_completed: false,
    });
    expect(tx.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'new-user' } }),
    );
  });

  it('locks the user and writes profile and goals in the same transaction, scoped to that user', async () => {
    await service.save('owner', input, true);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(tx.$queryRaw).toHaveBeenCalledWith(expect.any(Array), 'owner');
    expect(tx.userFinancialProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user_id: 'owner' },
        create: expect.objectContaining({
          user_id: 'owner',
          onboarding_completed: true,
        }),
      }),
    );
    expect(tx.userGoal.deleteMany).toHaveBeenCalledWith({
      where: { user_id: 'owner' },
    });
    expect(tx.userGoal.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ user_id: 'owner', name: 'Home' })],
    });
    expect(tx.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'owner' } }),
    );
  });

  it('does not overwrite completed onboarding', async () => {
    tx.userFinancialProfile.findUnique.mockResolvedValue({
      onboarding_completed: true,
    });
    await expect(service.save('owner', input, true)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(tx.userFinancialProfile.upsert).not.toHaveBeenCalled();
    expect(tx.userGoal.deleteMany).not.toHaveBeenCalled();
  });

  it('requires onboarding before updates', async () => {
    await expect(service.save('owner', input, false)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(tx.userGoal.deleteMany).not.toHaveBeenCalled();
  });

  it('updates completed profiles and replaces goals atomically', async () => {
    tx.userFinancialProfile.findUnique.mockResolvedValue({
      onboarding_completed: true,
    });
    await service.save('owner', input, false);
    expect(tx.userFinancialProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ onboarding_completed: true }),
      }),
    );
    expect(tx.userGoal.createMany).toHaveBeenCalledTimes(1);
  });

  it('propagates goal insertion failures to abort the transaction', async () => {
    tx.userGoal.createMany.mockRejectedValueOnce(new Error('insert failed'));
    await expect(service.save('owner', input, true)).rejects.toThrow(
      'insert failed',
    );
    expect(tx.user.findUnique).not.toHaveBeenCalled();
  });
});

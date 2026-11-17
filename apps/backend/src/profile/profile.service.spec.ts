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
    userGoal: {
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    userGoalContribution: { findMany: jest.fn() },
    user: { findUnique: jest.fn(), update: jest.fn() },
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
    tx.userGoal.updateMany.mockResolvedValue({ count: 1 });
    tx.userGoal.create.mockResolvedValue({});
    tx.userGoalContribution.findMany.mockResolvedValue([]);
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
    expect(tx.userGoal.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ user_id: 'owner', name: 'Home' }),
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

  it('saves the display name and payday in the same transaction as the profile', async () => {
    await service.save(
      'owner',
      { ...input, display_name: ' Alex ', payday: 28 },
      true,
    );
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'owner' },
      data: { name: 'Alex' },
    });
    expect(tx.userFinancialProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ payday: 28 }),
      }),
    );
  });

  it('preserves onboarding details when the legacy financial editor omits them', async () => {
    tx.userFinancialProfile.findUnique.mockResolvedValue({
      onboarding_completed: true,
    });
    await service.save('owner', input, false);
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.userFinancialProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          payday: undefined,
          budget_split: undefined,
        }),
      }),
    );
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
    expect(tx.userGoal.create).toHaveBeenCalledTimes(1);
  });

  it('updates goals with ids in place and only removes absent goals', async () => {
    tx.userFinancialProfile.findUnique.mockResolvedValue({
      onboarding_completed: true,
    });
    await service.save(
      'owner',
      {
        ...input,
        goals: [
          {
            id: 'goal-1',
            name: 'Home',
            target_amount: '1000000',
            target_date: '2030-01-01',
            priority: 'high',
          },
          {
            name: 'Car',
            target_amount: '500000',
            target_date: '2029-01-01',
            priority: 'medium',
          },
        ],
      },
      false,
    );
    expect(tx.userGoal.deleteMany).toHaveBeenCalledWith({
      where: { user_id: 'owner', id: { notIn: ['goal-1'] } },
    });
    expect(tx.userGoal.updateMany).toHaveBeenCalledWith({
      where: { id: 'goal-1', user_id: 'owner' },
      data: expect.objectContaining({ name: 'Home' }),
    });
    expect(tx.userGoal.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ user_id: 'owner', name: 'Car' }),
    });
  });

  it('propagates goal insertion failures to abort the transaction', async () => {
    tx.userGoal.create.mockRejectedValueOnce(new Error('insert failed'));
    await expect(service.save('owner', input, true)).rejects.toThrow(
      'insert failed',
    );
    expect(tx.user.findUnique).not.toHaveBeenCalled();
  });
});

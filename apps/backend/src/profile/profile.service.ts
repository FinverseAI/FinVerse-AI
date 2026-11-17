import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { validateProfile } from './profile.validation';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string, db: Prisma.TransactionClient = this.prisma) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        financialProfile: true,
        goals: { orderBy: [{ created_at: 'asc' }, { id: 'asc' }] },
      },
    });
    const profile = user?.financialProfile;
    if (!profile)
      return { profile: null, goals: [], onboarding_completed: false };
    const contributions = await db.userGoalContribution.findMany({
      where: { user_id: userId },
    });
    const savedByGoal = new Map<string, number>();
    for (const contribution of contributions) {
      savedByGoal.set(
        contribution.goal_id,
        (savedByGoal.get(contribution.goal_id) ?? 0) +
          Math.round(Number(contribution.amount) * 100),
      );
    }
    const emergency = {
      zero: '0',
      one_to_three: '1-3',
      three_to_six: '3-6',
      six_plus: '6+',
    };
    return {
      profile: {
        ...profile,
        employment_type:
          profile.employment_type === 'self_employed'
            ? 'self-employed'
            : profile.employment_type,
        emergency_fund_months: emergency[profile.emergency_fund_months],
      },
      goals: user.goals.map((goal) => ({
        ...goal,
        target_date: goal.target_date.toISOString().slice(0, 10),
        saved_amount: ((savedByGoal.get(goal.id) ?? 0) / 100).toFixed(2),
      })),
      onboarding_completed: profile.onboarding_completed,
    };
  }

  async save(userId: string, body: unknown, onboarding: boolean) {
    const { profile, goals, displayName } = validateProfile(body);
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
        const existing = await tx.userFinancialProfile.findUnique({
          where: { user_id: userId },
        });
        if (onboarding && existing?.onboarding_completed)
          throw new ConflictException(
            'Onboarding is already complete. Use PUT /api/profile to make changes.',
          );
        if (!onboarding && !existing?.onboarding_completed)
          throw new NotFoundException(
            'Complete onboarding before updating your profile.',
          );
        if (displayName !== undefined)
          await tx.user.update({
            where: { id: userId },
            data: { name: displayName },
          });
        await tx.userFinancialProfile.upsert({
          where: { user_id: userId },
          create: { ...profile, user_id: userId, onboarding_completed: true },
          update: { ...profile, onboarding_completed: true },
        });
        // Goals are upserted by id so a profile save never wipes their
        // contributions: only goals absent from the incoming list are
        // removed (their contributions cascade), known goals are updated
        // in place, and new ones are created.
        const incomingIds = goals
          .map((goal) => goal.id)
          .filter((id): id is string => Boolean(id));
        await tx.userGoal.deleteMany({
          where: {
            user_id: userId,
            ...(incomingIds.length ? { id: { notIn: incomingIds } } : {}),
          },
        });
        for (const goal of goals) {
          const { id, ...data } = goal;
          if (id) {
            // Scoped to the owner: an id belonging to another user (or a
            // goal deleted elsewhere) matches nothing, so the goal is
            // recreated fresh below instead of being dropped or hijacked.
            const updated = await tx.userGoal.updateMany({
              where: { id, user_id: userId },
              data,
            });
            if (updated.count) continue;
          }
          await tx.userGoal.create({ data: { ...data, user_id: userId } });
        }
        return this.get(userId, tx);
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Your profile was already saved. Reload to see the latest data.',
        );
      }
      throw error;
    }
  }
}

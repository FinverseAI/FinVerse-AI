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
        await tx.userGoal.deleteMany({ where: { user_id: userId } });
        await tx.userGoal.createMany({
          data: goals.map((goal) => ({ ...goal, user_id: userId })),
        });
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

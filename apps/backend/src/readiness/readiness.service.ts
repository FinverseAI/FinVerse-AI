import { Injectable } from '@nestjs/common';
import { MarketService } from '../market/market.service';
import { PortfolioService } from '../market/portfolio.service';
import { ProfileService } from '../profile/profile.service';
import {
  annualizedVolatility,
  scoreReadiness,
  type EmergencyFundBand,
  type ReadinessInputs,
  type ReadinessResult,
} from './readiness.formula';

/**
 * The readiness assessment: gathers the deterministic inputs (profile,
 * portfolio, price history) and scores them with the documented
 * formula. No model call happens here — this endpoint is pure numbers.
 *
 * Data failures degrade per holding, never for the whole assessment:
 * a holding whose history cannot be fetched is excluded from the
 * volatility factor (and the factor reports itself unavailable when
 * nothing is left), instead of failing the score. A missing financial
 * profile is the one hard requirement — the three cash-flow factors
 * need it, and a portfolio-only score would mislead.
 */
@Injectable()
export class ReadinessService {
  constructor(
    private readonly profile: ProfileService,
    private readonly portfolio: PortfolioService,
    private readonly market: MarketService,
  ) {}

  async assess(userId: string): Promise<ReadinessResult> {
    const data = await this.profile.get(userId);
    if (!data.profile) {
      return {
        available: false,
        reason:
          'Complete your financial profile to see your investment readiness score.',
        missing: ['financial profile'],
      };
    }
    const profile = data.profile;
    const monthlyIncome =
      Number(profile.monthly_income) +
      Number(profile.other_monthly_income ?? 0);
    const monthlyExpenses =
      Number(profile.fixed_expenses) + Number(profile.variable_expenses);
    const totalDebt = Number(profile.existing_debt_total ?? 0);
    const band = profile.emergency_fund_months as EmergencyFundBand;

    const summary = await this.portfolio.portfolioSummary(userId);
    const priced = summary.holdings.filter(
      (holding): holding is typeof holding & { currentValue: number } =>
        holding.priced && holding.currentValue !== null,
    );
    const holdings = priced.map((holding) => ({
      symbol: holding.symbol,
      currentValue: holding.currentValue,
    }));

    // Volatility needs 3 months of daily closes per holding. Histories
    // are fetched in parallel; a holding whose history fails is
    // excluded from the factor instead of failing the assessment.
    const histories = await Promise.all(
      priced.map(async (holding) => {
        try {
          const history = await this.market.history(holding.symbol, '3mo');
          return { holding, history };
        } catch {
          return { holding, history: null };
        }
      }),
    );
    const holdingVolatilities: ReadinessInputs['holdingVolatilities'] = [];
    let historyStale = false;
    for (const { holding, history } of histories) {
      if (!history) continue;
      if (history.stale) historyStale = true;
      const volatility = annualizedVolatility(
        history.bars.map((bar) => bar.close),
      );
      if (volatility === null) continue;
      holdingVolatilities.push({
        symbol: holding.symbol,
        volatility,
        currentValue: holding.currentValue,
      });
    }

    return scoreReadiness({
      emergencyFundBand: band,
      monthlyIncome,
      monthlyExpenses,
      totalDebt,
      holdings,
      holdingVolatilities,
      stale: summary.stale || historyStale,
      asOf: summary.asOf,
    });
  }
}

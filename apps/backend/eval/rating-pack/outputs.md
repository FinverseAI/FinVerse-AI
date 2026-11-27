# Rating outputs (blind)

## Healthy saver (healthy-saver)

Score: 100 out of 100 (Ready); 100 of 100 points measurable.

Factors (the ground truth the explanation must match):
- Emergency fund: 25/25 points — Your emergency fund covers 6+ months of expenses (6+ months is full marks).
- Debt-to-income: 20/20 points — You carry no debt.
- Monthly surplus: 25/25 points — Monthly surplus of ₹50,000 is 41.7% of income (30% is full marks).
- Portfolio concentration: 15/15 points — Your largest holding, RELIANCE, is 19.6% of your portfolio (20% or less is full marks).
- Portfolio volatility: 15/15 points — Your portfolio's annualized volatility is 12% (value-weighted average across 6 holdings; 15% or less is full marks).

Top improvements (computed by code):
- None — every measured factor is at full marks.

### Output S01-A

Your investment readiness score is 100 out of 100 (Ready). Emergency fund: 6 months of expenses saved, worth 25 of 25 points. Debt-to-income: ₹0 of debt against ₹14,40,000 of annual income (ratio 0), worth 20 of 20 points. Monthly surplus: ₹50,000 a month (41.7% of income), worth 25 of 25 points. Portfolio concentration: your largest holding (RELIANCE) is 19.6% of the portfolio, worth 15 of 15 points. Portfolio volatility: 12% annualised across 6 holdings with enough history, worth 15 of 15 points.

Claims cited:

- Your investment readiness score is 100 out of 100 (Ready).
- Emergency fund: 6 months of expenses saved, worth 25 of 25 points.
- Debt-to-income: ₹0 of debt against ₹14,40,000 of annual income (ratio 0), worth 20 of 20 points.
- Monthly surplus: ₹50,000 a month (41.7% of income), worth 25 of 25 points.
- Portfolio concentration: your largest holding (RELIANCE) is 19.6% of the portfolio, worth 15 of 15 points.
- Portfolio volatility: 12% annualised across 6 holdings with enough history, worth 15 of 15 points.

### Output S01-B

Your readiness score is 100 on a scale of 100 (maxScore 100), which places you in the "Ready" band. Every factor in the assessment earned its full points, so nothing is pulling the score down.

What pulls it up:
- Emergency fund — 25 points out of maxPoints 25. Your fund covers 6 months of expenses (monthsLabel "6+ months"), which sits at the full-marks level.
- Debt-to-income — 20 points out of maxPoints 20. Your debtToIncomeRatio is 0 with totalDebt 0 against annualIncome of ₹1440000, so you carry no debt.
- Monthly surplus — 25 points out of maxPoints 25. A surplus of ₹50000 on monthlyIncome of ₹120000 gives a surplusRatePercent of 41.7, above the full-marks level.
- Portfolio concentration — 15 points out of maxPoints 15. Your largest holding, RELIANCE, is 19.6% of the portfolio across holdingsCount 6, at the full-marks level.
- Portfolio volatility — 15 points out of maxPoints 15. Annualized volatilityPercent is 12, a value-weighted average across holdingsWithHistory 6, at the full-marks level.

What pulls it down: nothing in this assessment. No factor falls short of its maxPoints, and the assessment is current (stale false).

What would move the score most: the assessment's suggestions list is empty, so the data contains no suggestion to point you toward. The score already equals maxScore 100, so there is no headroom above it in this data. For context, totalPortfolioValue is ₹920000 with pricedHoldingsCount 6 out of holdingsCount 6, and asOf is null, so no as-at date is attached to these figures.

Claims cited:

- The readiness score is 100 on a scale of 100 (maxScore 100), in the "Ready" band.
- Emergency fund earned 25 points out of maxPoints 25, with months 6 (monthsLabel "6+ months"), at the full-marks level.
- Debt-to-income earned 20 points out of maxPoints 20: debtToIncomeRatio 0 and totalDebt 0 against annualIncome ₹1440000, meaning no debt.
- Monthly surplus earned 25 points out of maxPoints 25: surplus ₹50000 on monthlyIncome ₹120000, a surplusRatePercent of 41.7, above the full-marks level.
- Portfolio concentration earned 15 points out of maxPoints 15: largest holding RELIANCE at largestHoldingWeightPercent 19.6 across holdingsCount 6, at the full-marks level.
- Portfolio volatility earned 15 points out of maxPoints 15: volatilityPercent 12, a value-weighted average across holdingsWithHistory 6, at the full-marks level.
- No factor falls short of its maxPoints and the assessment is current (stale false), so nothing pulls the score below maxScore 100.
- The assessment's suggestions list is empty and the score already equals maxScore 100, so the data offers no suggestion that would raise it further.
- Context figures: totalPortfolioValue ₹920000 with pricedHoldingsCount 6 out of holdingsCount 6, and asOf null, so no as-at date is attached.

## Over-spender (over-spender)

Score: 48 out of 100 (Building); 100 of 100 points measurable.

Factors (the ground truth the explanation must match):
- Emergency fund: 8.3/25 points — Your emergency fund covers 1-3 months of expenses (6+ months is full marks).
- Debt-to-income: 17.2/20 points — Total debt of ₹1,50,000 is 0.14× your annual income of ₹10,80,000.
- Monthly surplus: 0/25 points — Monthly surplus of -₹5,000 is -5.6% of income (30% is full marks).
- Portfolio concentration: 10.3/15 points — Your largest holding, RELIANCE, is 44.9% of your portfolio (20% or less is full marks).
- Portfolio volatility: 11.7/15 points — Your portfolio's annualized volatility is 25% (value-weighted average across 3 holdings; 15% or less is full marks).

Top improvements (computed by code):
- Raising your monthly surplus to ₹27,000 (30% of income) would add 25 points.
- Build your emergency fund to 6 months (currently 1-3 months) to gain 16.7 points.
- Reducing RELIANCE below 20% of your portfolio (currently 44.9%) would add 4.7 points.

### Output S02-A

Your score is 48 out of 100, which puts you in the "Building" band. The biggest drag is your monthly surplus: it earns 0 points out of a possible 25, the weakest result of the five measured factors. Your monthly surplus is -₹5,000 against monthly income of ₹90,000, which is -5.6% of income. The assessment's largest single suggestion lines up with this: raising your monthly surplus to ₹27,000 (30% of income) would add 25 points. The next biggest drag is your emergency fund, at 8.3 points out of 25, covering 2 months of expenses; building it to 6 months would gain 16.7 points. Third is portfolio concentration, at 10.3 points out of 15, because your largest holding, RELIANCE, is 44.9% of your portfolio across 3 holdings; reducing RELIANCE below 20% would add 4.7 points. Working in your favour, debt-to-income is your strongest factor at 17.2 points out of 20, with total debt of ₹1,50,000 at 0.14× your annual income of ₹10,80,000. Portfolio volatility contributes 11.7 points out of 15, with annualized volatility of 25% across 3 holdings with history. So the order of impact is clear: monthly surplus (25 points), then emergency fund (16.7 points), then concentration (4.7 points). All five factors were measurable, so nothing here is a gap in the data.

Claims cited:

- The readiness score is 48 on a scale of 100, in the Building band.
- Monthly surplus scores 0 points out of 25, with a surplus of -5000 on monthly income of 90000, a rate of -5.6%.
- The Monthly surplus suggestion would add 25 points by raising the surplus to 27000, a rate of 30%.
- Emergency fund scores 8.3 points out of 25 and covers 2 months of expenses.
- The Emergency fund suggestion would gain 16.7 points by building the fund to 6 months.
- Portfolio concentration scores 10.3 points out of 15, with RELIANCE at 44.9% of the portfolio across 3 holdings.
- The Portfolio concentration suggestion would add 4.7 points by reducing RELIANCE below 20% of the portfolio.
- Debt-to-income is the strongest factor at 17.2 points out of 20, with total debt of 150000 at 0.14x annual income of 1080000.
- Portfolio volatility scores 11.7 points out of 15, with annualized volatility of 25% across 3 holdings with history.

### Output S02-B

Your investment readiness score is 48 out of 100 (Building). Emergency fund: 2 months of expenses saved, worth 8.3 of 25 points. Debt-to-income: ₹1,50,000 of debt against ₹10,80,000 of annual income (ratio 0.14), worth 17.2 of 20 points. Monthly surplus: -₹5,000 a month (-5.6% of income), worth 0 of 25 points. Portfolio concentration: your largest holding (RELIANCE) is 44.9% of the portfolio, worth 10.3 of 15 points. Portfolio volatility: 25% annualised across 3 holdings with enough history, worth 11.7 of 15 points. Raising your monthly surplus to ₹27,000 (30% of income) would add 25 points. Build your emergency fund to 6 months (currently 1-3 months) to gain 16.7 points. Reducing RELIANCE below 20% of your portfolio (currently 44.9%) would add 4.7 points.

Claims cited:

- Your investment readiness score is 48 out of 100 (Building).
- Emergency fund: 2 months of expenses saved, worth 8.3 of 25 points.
- Debt-to-income: ₹1,50,000 of debt against ₹10,80,000 of annual income (ratio 0.14), worth 17.2 of 20 points.
- Monthly surplus: -₹5,000 a month (-5.6% of income), worth 0 of 25 points.
- Portfolio concentration: your largest holding (RELIANCE) is 44.9% of the portfolio, worth 10.3 of 15 points.
- Portfolio volatility: 25% annualised across 3 holdings with enough history, worth 11.7 of 15 points.
- Raising your monthly surplus to ₹27,000 (30% of income) would add 25 points.
- Build your emergency fund to 6 months (currently 1-3 months) to gain 16.7 points.
- Reducing RELIANCE below 20% of your portfolio (currently 44.9%) would add 4.7 points.

## Concentrated portfolio (concentrated-portfolio)

Score: 82 out of 100 (Ready); 100 of 100 points measurable.

Factors (the ground truth the explanation must match):
- Emergency fund: 18.8/25 points — Your emergency fund covers 3-6 months of expenses (6+ months is full marks).
- Debt-to-income: 20/20 points — You carry no debt.
- Monthly surplus: 25/25 points — Monthly surplus of ₹60,000 is 40% of income (30% is full marks).
- Portfolio concentration: 3.7/15 points — Your largest holding, RELIANCE, is 80% of your portfolio (20% or less is full marks).
- Portfolio volatility: 14/15 points — Your portfolio's annualized volatility is 18% (value-weighted average across 3 holdings; 15% or less is full marks).

Top improvements (computed by code):
- Reducing RELIANCE below 20% of your portfolio (currently 80%) would add 11.3 points.
- Build your emergency fund to 6 months (currently 3-6 months) to gain 6.2 points.
- Reducing your portfolio's volatility to 15% or below (currently 18%) would add 1 points.

### Output S03-A

Your score is 82 on a scale of 100 (maxScore 100), which places you in the Ready band. The assessment was available, not stale, and asOf is null.

What pulls the score up:
- Debt-to-income earns the full points: 20 out of maxPoints 20. You carry no debt — totalDebt 0 and debtToIncomeRatio 0 on annualIncome ₹1,800,000.
- Monthly surplus also earns full points: 25 out of maxPoints 25. A surplus of ₹60,000 on monthlyIncome ₹150,000 gives a surplusRatePercent of 40, above the full-marks level.
- Emergency fund earns 18.8 out of maxPoints 25, with months at 4.5 — not yet at the full-marks level.
- Portfolio volatility earns 14 out of maxPoints 15, with volatilityPercent 18 across holdingsWithHistory 3 — close to full marks.

What pulls the score down:
- Portfolio concentration earns only 3.7 out of maxPoints 15. Your largestHoldingSymbol RELIANCE sits at largestHoldingWeightPercent 80 of the portfolio, across holdingsCount 3.

What would move the score most, using the suggestions in the data:
- Portfolio concentration: pointsGain 11.3 — the largest single gain on offer.
- Emergency fund: pointsGain 6.2.
- Portfolio volatility: pointsGain 1.

For context, totalPortfolioValue is ₹1,000,000 with pricedHoldingsCount 3.

Claims cited:

- Your readiness score is 82 on a scale of 100, in the Ready band, and the assessment was available and not stale.
- Debt-to-income earns the full 20 points out of maxPoints 20 because you carry no debt.
- Monthly surplus earns the full 25 points out of maxPoints 25, with a surplusRatePercent of 40 above the full-marks level.
- Emergency fund earns 18.8 points out of maxPoints 25, with months at 4.5.
- Portfolio volatility earns 14 points out of maxPoints 15, with volatilityPercent 18 across holdingsWithHistory 3.
- Portfolio concentration earns only 3.7 points out of maxPoints 15 because RELIANCE is 80% of the portfolio.
- The largest suggested gain is 11.3 points from the Portfolio concentration suggestion on RELIANCE.
- The Emergency fund suggestion would add 6.2 points.
- The Portfolio volatility suggestion would add 1 point.
- The portfolio context is a totalPortfolioValue of ₹1,000,000 with pricedHoldingsCount 3.

### Output S03-B

Your investment readiness score is 82 out of 100 (Ready). Emergency fund: 4.5 months of expenses saved, worth 18.8 of 25 points. Debt-to-income: ₹0 of debt against ₹18,00,000 of annual income (ratio 0), worth 20 of 20 points. Monthly surplus: ₹60,000 a month (40% of income), worth 25 of 25 points. Portfolio concentration: your largest holding (RELIANCE) is 80% of the portfolio, worth 3.7 of 15 points. Portfolio volatility: 18% annualised across 3 holdings with enough history, worth 14 of 15 points. Reducing RELIANCE below 20% of your portfolio (currently 80%) would add 11.3 points. Build your emergency fund to 6 months (currently 3-6 months) to gain 6.2 points. Reducing your portfolio's volatility to 15% or below (currently 18%) would add 1 points.

Claims cited:

- Your investment readiness score is 82 out of 100 (Ready).
- Emergency fund: 4.5 months of expenses saved, worth 18.8 of 25 points.
- Debt-to-income: ₹0 of debt against ₹18,00,000 of annual income (ratio 0), worth 20 of 20 points.
- Monthly surplus: ₹60,000 a month (40% of income), worth 25 of 25 points.
- Portfolio concentration: your largest holding (RELIANCE) is 80% of the portfolio, worth 3.7 of 15 points.
- Portfolio volatility: 18% annualised across 3 holdings with enough history, worth 14 of 15 points.
- Reducing RELIANCE below 20% of your portfolio (currently 80%) would add 11.3 points.
- Build your emergency fund to 6 months (currently 3-6 months) to gain 6.2 points.
- Reducing your portfolio's volatility to 15% or below (currently 18%) would add 1 points.

## Diversified portfolio (diversified-portfolio)

Score: 99 out of 100 (Ready); 100 of 100 points measurable.

Factors (the ground truth the explanation must match):
- Emergency fund: 25/25 points — Your emergency fund covers 6+ months of expenses (6+ months is full marks).
- Debt-to-income: 19.2/20 points — Total debt of ₹1,00,000 is 0.04× your annual income of ₹24,00,000.
- Monthly surplus: 25/25 points — Monthly surplus of ₹70,000 is 35% of income (30% is full marks).
- Portfolio concentration: 15/15 points — Your largest holding, RELIANCE, is 10% of your portfolio (20% or less is full marks).
- Portfolio volatility: 15/15 points — Your portfolio's annualized volatility is 14% (value-weighted average across 10 holdings; 15% or less is full marks).

Top improvements (computed by code):
- Clearing your ₹1,00,000 debt would add 0.8 points.

### Output S04-A

Your investment readiness score is 99 out of 100 (Ready). Emergency fund: 6 months of expenses saved, worth 25 of 25 points. Debt-to-income: ₹1,00,000 of debt against ₹24,00,000 of annual income (ratio 0.04), worth 19.2 of 20 points. Monthly surplus: ₹70,000 a month (35% of income), worth 25 of 25 points. Portfolio concentration: your largest holding (RELIANCE) is 10% of the portfolio, worth 15 of 15 points. Portfolio volatility: 14% annualised across 10 holdings with enough history, worth 15 of 15 points. Clearing your ₹1,00,000 debt would add 0.8 points.

Claims cited:

- Your investment readiness score is 99 out of 100 (Ready).
- Emergency fund: 6 months of expenses saved, worth 25 of 25 points.
- Debt-to-income: ₹1,00,000 of debt against ₹24,00,000 of annual income (ratio 0.04), worth 19.2 of 20 points.
- Monthly surplus: ₹70,000 a month (35% of income), worth 25 of 25 points.
- Portfolio concentration: your largest holding (RELIANCE) is 10% of the portfolio, worth 15 of 15 points.
- Portfolio volatility: 14% annualised across 10 holdings with enough history, worth 15 of 15 points.
- Clearing your ₹1,00,000 debt would add 0.8 points.

### Output S04-B

Your investment readiness score is 99 on a scale of 100 (maxScore 100), which places you in the "Ready" band. The assessment is not stale, and every factor in it was measured, so nothing had to be guessed.

Factors pulling the score up (all at their full points):
- Emergency fund — points 25 of maxPoints 25. Your emergency fund covers months 6 (monthsLabel "6+ months"), which is above the full-marks level.
- Monthly surplus — points 25 of maxPoints 25. A monthly surplus of ₹70,000 on monthlyIncome of ₹200,000 is a surplusRatePercent of 35, above the full-marks level.
- Portfolio concentration — points 15 of maxPoints 15. Your largest holding, RELIANCE, is largestHoldingWeightPercent 10 of the portfolio spread across holdingsCount 10, within the full-marks level.
- Portfolio volatility — points 15 of maxPoints 15. Annualized volatilityPercent is 14, measured as a value-weighted average across holdingsWithHistory 10, within the full-marks level.

Factor pulling the score down:
- Debt-to-income — points 19.2 of maxPoints 20, the only factor short of its full points. Total debt (totalDebt) of ₹1,00,000 against annualIncome of ₹24,00,000 gives a debtToIncomeRatio of 0.04.

What would move the score most: the assessment lists a single suggestion, and it is on Debt-to-income — clearing your ₹1,00,000 debt, taking targetDebt to 0, would add pointsGain 0.8 points. That is the only improvement the data offers, and it is exactly the gap between the factor's points of 19.2 and its maxPoints of 20. I am reporting what the computed assessment says, not recommending any investment or action.

Claims cited:

- The readiness score is 99 on a scale of 100 with maxScore 100, in the "Ready" band, and the assessment is available and not stale.
- Emergency fund earned points 25 out of maxPoints 25, with months 6 (monthsLabel "6+ months"), which is above the full-marks level.
- Monthly surplus earned points 25 out of maxPoints 25: surplus of ₹70,000 on monthlyIncome of ₹200,000 is surplusRatePercent 35, above the full-marks level.
- Portfolio concentration earned points 15 out of maxPoints 15: largest holding RELIANCE is largestHoldingWeightPercent 10 across holdingsCount 10, within the full-marks level.
- Portfolio volatility earned points 15 out of maxPoints 15: volatilityPercent 14 across holdingsWithHistory 10, within the full-marks level.
- Debt-to-income earned points 19.2 out of maxPoints 20, the only factor short of full points: totalDebt of ₹1,00,000 against annualIncome of ₹24,00,000 gives debtToIncomeRatio 0.04.
- The only suggestion in the assessment is on Debt-to-income: clearing the ₹1,00,000 debt to targetDebt 0 would add pointsGain 0.8 points.

## High debt (high-debt)

Score: 33 out of 100 (Not ready); 100 of 100 points measurable.

Factors (the ground truth the explanation must match):
- Emergency fund: 0/25 points — Your emergency fund covers 0 months of expenses (6+ months is full marks).
- Debt-to-income: 0/20 points — Total debt of ₹12,00,000 is 1.25× your annual income of ₹9,60,000.
- Monthly surplus: 15.6/25 points — Monthly surplus of ₹15,000 is 18.8% of income (30% is full marks).
- Portfolio concentration: 7.5/15 points — Your largest holding, RELIANCE, is 60% of your portfolio (20% or less is full marks).
- Portfolio volatility: 10/15 points — Your portfolio's annualized volatility is 30% (value-weighted average across 2 holdings; 15% or less is full marks).

Top improvements (computed by code):
- Build your emergency fund to 6 months (currently 0 months) to gain 25 points.
- Clearing your ₹12,00,000 debt would add 20 points.
- Raising your monthly surplus to ₹24,000 (30% of income) would add 9.4 points.

### Output S05-A

Your investment readiness score is 33 out of 100 (Not ready). Emergency fund: 0 months of expenses saved, worth 0 of 25 points. Debt-to-income: ₹12,00,000 of debt against ₹9,60,000 of annual income (ratio 1.25), worth 0 of 20 points. Monthly surplus: ₹15,000 a month (18.8% of income), worth 15.6 of 25 points. Portfolio concentration: your largest holding (RELIANCE) is 60% of the portfolio, worth 7.5 of 15 points. Portfolio volatility: 30% annualised across 2 holdings with enough history, worth 10 of 15 points. Build your emergency fund to 6 months (currently 0 months) to gain 25 points. Clearing your ₹12,00,000 debt would add 20 points. Raising your monthly surplus to ₹24,000 (30% of income) would add 9.4 points.

Claims cited:

- Your investment readiness score is 33 out of 100 (Not ready).
- Emergency fund: 0 months of expenses saved, worth 0 of 25 points.
- Debt-to-income: ₹12,00,000 of debt against ₹9,60,000 of annual income (ratio 1.25), worth 0 of 20 points.
- Monthly surplus: ₹15,000 a month (18.8% of income), worth 15.6 of 25 points.
- Portfolio concentration: your largest holding (RELIANCE) is 60% of the portfolio, worth 7.5 of 15 points.
- Portfolio volatility: 30% annualised across 2 holdings with enough history, worth 10 of 15 points.
- Build your emergency fund to 6 months (currently 0 months) to gain 25 points.
- Clearing your ₹12,00,000 debt would add 20 points.
- Raising your monthly surplus to ₹24,000 (30% of income) would add 9.4 points.

### Output S05-B

Your computed readiness score is 33 out of 100, in the "Not ready" band. Every factor was measured, so nothing is missing from the picture.

Pulling the score down:
- Emergency fund: 0 points out of 25. It covers 0 months of expenses, below the full-marks level. This is the largest block of unearned points in the assessment.
- Debt-to-income: 0 points out of 20. Total debt of ₹12,00,000 is 1.25× your annual income of ₹9,60,000.
- Portfolio concentration: 7.5 points out of 15. Your largest holding, RELIANCE, is 60% of a portfolio holding 2 positions, above the full-marks level.
- Portfolio volatility: 10 points out of 15. Annualized volatility is 30% across 2 holdings with price history, above the full-marks level.

Pulling the score up:
- Monthly surplus: 15.6 points out of 25, the largest points contribution of any factor. A monthly surplus of ₹15,000 on monthly income of ₹80,000 is 18.8% of income, below the full-marks level.

What to fix first, using the assessment's own suggestions:
- Emergency fund comes first: building it up to the suggested target level would gain 25 points, the biggest single gain listed.
- Debt-to-income is next: clearing the debt (target debt 0) would add 20 points.
- Monthly surplus is the smallest lever: raising the surplus to ₹24,000 would add 9.4 points.

So the order is emergency fund, then debt. They are the only factors sitting at 0 points, and they carry the largest gains in the suggestions. This explains the computed assessment only; it is not a recommendation to buy or sell anything.

Claims cited:

- The computed readiness score is 33 on a scale of 100, in the "Not ready" band.
- Every factor was measured and the assessment is not stale.
- Emergency fund earns 0 of 25 points and covers 0 months of expenses.
- Debt-to-income earns 0 of 20 points; total debt of ₹12,00,000 is 1.25× annual income of ₹9,60,000.
- Monthly surplus earns 15.6 of 25 points; a surplus of ₹15,000 on monthly income of ₹80,000 is 18.8% of income.
- Portfolio concentration earns 7.5 of 15 points; RELIANCE is 60% of the portfolio, which has 2 holdings.
- Portfolio volatility earns 10 of 15 points; annualized volatility is 30% across 2 holdings with history.
- The suggestion for the emergency fund is to build it to the target level, gaining 25 points.
- The suggestion for debt-to-income is clearing the debt to a target debt of 0, adding 20 points.
- The suggestion for monthly surplus is raising the surplus to ₹24,000, adding 9.4 points.

## No emergency fund (no-emergency-fund)

Score: 74 out of 100 (Ready); 100 of 100 points measurable.

Factors (the ground truth the explanation must match):
- Emergency fund: 0/25 points — Your emergency fund covers 0 months of expenses (6+ months is full marks).
- Debt-to-income: 20/20 points — You carry no debt.
- Monthly surplus: 25/25 points — Monthly surplus of ₹40,000 is 40% of income (30% is full marks).
- Portfolio concentration: 14.1/15 points — Your largest holding, RELIANCE, is 25% of your portfolio (20% or less is full marks).
- Portfolio volatility: 14.7/15 points — Your portfolio's annualized volatility is 16% (value-weighted average across 5 holdings; 15% or less is full marks).

Top improvements (computed by code):
- Build your emergency fund to 6 months (currently 0 months) to gain 25 points.
- Reducing RELIANCE below 20% of your portfolio (currently 25%) would add 0.9 points.
- Reducing your portfolio's volatility to 15% or below (currently 16%) would add 0.3 points.

### Output S06-A

Your investment readiness score is 74 out of 100 (Ready). Emergency fund: 0 months of expenses saved, worth 0 of 25 points. Debt-to-income: ₹0 of debt against ₹12,00,000 of annual income (ratio 0), worth 20 of 20 points. Monthly surplus: ₹40,000 a month (40% of income), worth 25 of 25 points. Portfolio concentration: your largest holding (RELIANCE) is 25% of the portfolio, worth 14.1 of 15 points. Portfolio volatility: 16% annualised across 5 holdings with enough history, worth 14.7 of 15 points. Build your emergency fund to 6 months (currently 0 months) to gain 25 points. Reducing RELIANCE below 20% of your portfolio (currently 25%) would add 0.9 points. Reducing your portfolio's volatility to 15% or below (currently 16%) would add 0.3 points.

Claims cited:

- Your investment readiness score is 74 out of 100 (Ready).
- Emergency fund: 0 months of expenses saved, worth 0 of 25 points.
- Debt-to-income: ₹0 of debt against ₹12,00,000 of annual income (ratio 0), worth 20 of 20 points.
- Monthly surplus: ₹40,000 a month (40% of income), worth 25 of 25 points.
- Portfolio concentration: your largest holding (RELIANCE) is 25% of the portfolio, worth 14.1 of 15 points.
- Portfolio volatility: 16% annualised across 5 holdings with enough history, worth 14.7 of 15 points.
- Build your emergency fund to 6 months (currently 0 months) to gain 25 points.
- Reducing RELIANCE below 20% of your portfolio (currently 25%) would add 0.9 points.
- Reducing your portfolio's volatility to 15% or below (currently 16%) would add 0.3 points.

### Output S06-B

Your readiness score is 74 on a scale of 100 (maxScore 100), which lands in the "Ready" band. It is built from five measured factors, and here is how they add up.

Pulling the score UP:
- Debt-to-income: 20 points out of maxPoints 20, the full allocation. You carry no debt (totalDebt 0, debtToIncomeRatio 0) against annualIncome 1200000.
- Monthly surplus: 25 points out of maxPoints 25, also full marks. A surplus of 40000 on monthlyIncome 100000 gives a surplusRatePercent of 40, above the full-marks level.
- Portfolio volatility: 14.7 points out of maxPoints 15. Annualized volatility is volatilityPercent 16, measured across holdingsWithHistory 5, just above the full-marks level.
- Portfolio concentration: 14.1 points out of maxPoints 15. Your largest holding, RELIANCE, is largestHoldingWeightPercent 25 of the portfolio across holdingsCount 5, above the full-marks level.

Pulling the score DOWN:
- Emergency fund: 0 points out of maxPoints 25. Your fund covers months 0 (emergencyFundMonths 0, monthsLabel "0 months"), so this factor contributes nothing at all. It is the only factor scoring zero, and it is the single biggest drag on the total.

What would move the score most: the suggestions rank the emergency fund first by a wide margin. Building it to the suggestion's targetMonths 6 would add pointsGain 25. The other two suggestions are far smaller: reducing RELIANCE (symbol RELIANCE) to targetWeightPercent 20 would add pointsGain 0.9, and reducing volatility to targetVolatilityPercent 15 would add pointsGain 0.3. So the emergency fund is where the score has the most room to move; the concentration and volatility items are marginal by comparison.

For context, the assessment is based on totalPortfolioValue 500000 with pricedHoldingsCount 5.

Claims cited:

- Your readiness score is 74 on a scale of 100, in the Ready band.
- Emergency fund scored 0 points out of 25, with 0 months of expenses covered.
- Debt-to-income scored the full 20 points out of 20 because you carry no debt.
- Monthly surplus scored the full 25 points out of 25, with a surplus of 40000 on monthly income of 100000, a rate of 40.
- Portfolio concentration scored 14.1 points out of 15, with RELIANCE at 25 percent of the portfolio across 5 holdings.
- Portfolio volatility scored 14.7 points out of 15, with annualized volatility of 16 measured across 5 holdings with history.
- The largest suggested gain is 25 points from building the emergency fund to the suggested target of 6 months.
- Reducing RELIANCE to the suggested target weight of 20 percent would add 0.9 points.
- Reducing volatility to the suggested target of 15 would add 0.3 points.
- The assessment is based on a total portfolio value of 500000 with 5 priced holdings.

## Volatile holdings (volatile-holdings)

Score: 76 out of 100 (Ready); 100 of 100 points measurable.

Factors (the ground truth the explanation must match):
- Emergency fund: 18.8/25 points — Your emergency fund covers 3-6 months of expenses (6+ months is full marks).
- Debt-to-income: 19.2/20 points — Total debt of ₹50,000 is 0.04× your annual income of ₹13,20,000.
- Monthly surplus: 25/25 points — Monthly surplus of ₹35,000 is 31.8% of income (30% is full marks).
- Portfolio concentration: 13.2/15 points — Your largest holding, SMALLCAP1, is 29.4% of your portfolio (20% or less is full marks).
- Portfolio volatility: 0/15 points — Your portfolio's annualized volatility is 65% (value-weighted average across 4 holdings; 15% or less is full marks).

Top improvements (computed by code):
- Reducing your portfolio's volatility to 15% or below (currently 65%) would add 15 points.
- Build your emergency fund to 6 months (currently 3-6 months) to gain 6.2 points.
- Reducing SMALLCAP1 below 20% of your portfolio (currently 29.4%) would add 1.8 points.

### Output S07-A

Your investment readiness score is 76 out of 100 (Ready). Emergency fund: 4.5 months of expenses saved, worth 18.8 of 25 points. Debt-to-income: ₹50,000 of debt against ₹13,20,000 of annual income (ratio 0.04), worth 19.2 of 20 points. Monthly surplus: ₹35,000 a month (31.8% of income), worth 25 of 25 points. Portfolio concentration: your largest holding (SMALLCAP1) is 29.4% of the portfolio, worth 13.2 of 15 points. Portfolio volatility: 65% annualised across 4 holdings with enough history, worth 0 of 15 points. Reducing your portfolio's volatility to 15% or below (currently 65%) would add 15 points. Build your emergency fund to 6 months (currently 3-6 months) to gain 6.2 points. Reducing SMALLCAP1 below 20% of your portfolio (currently 29.4%) would add 1.8 points.

Claims cited:

- Your investment readiness score is 76 out of 100 (Ready).
- Emergency fund: 4.5 months of expenses saved, worth 18.8 of 25 points.
- Debt-to-income: ₹50,000 of debt against ₹13,20,000 of annual income (ratio 0.04), worth 19.2 of 20 points.
- Monthly surplus: ₹35,000 a month (31.8% of income), worth 25 of 25 points.
- Portfolio concentration: your largest holding (SMALLCAP1) is 29.4% of the portfolio, worth 13.2 of 15 points.
- Portfolio volatility: 65% annualised across 4 holdings with enough history, worth 0 of 15 points.
- Reducing your portfolio's volatility to 15% or below (currently 65%) would add 15 points.
- Build your emergency fund to 6 months (currently 3-6 months) to gain 6.2 points.
- Reducing SMALLCAP1 below 20% of your portfolio (currently 29.4%) would add 1.8 points.

### Output S07-B

Your readiness score is 76 out of 100, which places you in the 'Ready' band. The score is built from the measured factors below; I am quoting the computed numbers exactly as given, not recalculating them.

What pulls the score up:
- Monthly surplus is the strongest factor, earning the full 25 points. A monthly surplus of ₹35,000 on monthly income of ₹110,000 is a surplus rate of 31.8%, which is above the full-marks level.
- Debt-to-income earns 19.2 points. Total debt of ₹50,000 is 0.04× your annual income of ₹13,20,000, so debt is barely a drag.
- Emergency fund earns 18.8 of 25 points, covering 4.5 months of expenses — solid, but short of the full-marks level.
- Portfolio concentration earns 13.2 points. Your largest holding, SMALLCAP1, is 29.4% of the portfolio across 4 holdings, which is above the full-marks level for this factor.

What pulls the score down:
- Portfolio volatility earns 0 points. Annualized volatility is 65% (value-weighted across 4 holdings with history), far above the full-marks level, so this factor adds nothing.

What would move the score most, using the assessment's suggestions:
- Reducing portfolio volatility would add more points than any other single change — more than the 6.2 points available from building the emergency fund to the full-marks level, and more than the 1.8 points from reducing SMALLCAP1 below the full-marks weight level.
- Building the emergency fund to the full-marks level would add 6.2 points.
- Reducing SMALLCAP1 below the full-marks weight level would add 1.8 points.

In short: a strong surplus, low debt and a decent emergency fund carry the score, while 0 points from volatility is the main drag, with concentration and the emergency fund the smaller gaps.

Claims cited:

- The readiness score is 76 on a scale of 100, in the 'Ready' band.
- Monthly surplus earns the full 25 points: a surplus of ₹35,000 on monthly income of ₹110,000 is 31.8% of income, above the full-marks level.
- Debt-to-income earns 19.2 points: total debt of ₹50,000 is 0.04× annual income of ₹13,20,000.
- Emergency fund earns 18.8 of 25 points, covering 4.5 months of expenses.
- Portfolio concentration earns 13.2 points; the largest holding, SMALLCAP1, is 29.4% of the portfolio across 4 holdings, above the full-marks level.
- Portfolio volatility earns 0 points, with annualized volatility of 65% across 4 holdings with history.
- The suggestion to reduce portfolio volatility would add more points than any other single change in the assessment.
- Building the emergency fund to the full-marks level would add 6.2 points.
- Reducing SMALLCAP1 below the full-marks weight level would add 1.8 points.

## No portfolio yet (no-portfolio)

Score: 91 out of 100 (Ready); 70 of 100 points measurable.

Factors (the ground truth the explanation must match):
- Emergency fund: 18.8/25 points — Your emergency fund covers 3-6 months of expenses (6+ months is full marks).
- Debt-to-income: 20/20 points — You carry no debt.
- Monthly surplus: 25/25 points — Monthly surplus of ₹25,000 is 33.3% of income (30% is full marks).
- Portfolio concentration: not measured — No priced holdings, so concentration cannot be measured.
- Portfolio volatility: not measured — Not enough price history for your holdings yet, so volatility cannot be measured.

Top improvements (computed by code):
- Build your emergency fund to 6 months (currently 3-6 months) to gain 6.2 points.

### Output S08-A

Your investment readiness score is 91 out of 100 (Ready). Only 70 of the 100 points could be measured from your data. Emergency fund: 4.5 months of expenses saved, worth 18.8 of 25 points. Debt-to-income: ₹0 of debt against ₹9,00,000 of annual income (ratio 0), worth 20 of 20 points. Monthly surplus: ₹25,000 a month (33.3% of income), worth 25 of 25 points. Portfolio concentration: no priced holdings, so concentration cannot be measured. Portfolio volatility: not enough price history for your holdings yet, so volatility cannot be measured. Build your emergency fund to 6 months (currently 3-6 months) to gain 6.2 points.

Claims cited:

- Your investment readiness score is 91 out of 100 (Ready). Only 70 of the 100 points could be measured from your data.
- Emergency fund: 4.5 months of expenses saved, worth 18.8 of 25 points.
- Debt-to-income: ₹0 of debt against ₹9,00,000 of annual income (ratio 0), worth 20 of 20 points.
- Monthly surplus: ₹25,000 a month (33.3% of income), worth 25 of 25 points.
- Portfolio concentration: no priced holdings, so concentration cannot be measured.
- Portfolio volatility: not enough price history for your holdings yet, so volatility cannot be measured.
- Build your emergency fund to 6 months (currently 3-6 months) to gain 6.2 points.

### Output S08-B

Your computed readiness score is 91 on a scale of 100, and the assessment places you in the Ready band (its maxScore field reads 70). The measured factors that pull the score up: Debt-to-income earns the full 20 points out of 20, because your debt-to-income ratio is 0 and total debt is 0 against annual income of ₹900,000. Monthly surplus also earns the full 25 points out of 25: a monthly surplus of ₹25,000 on monthly income of ₹75,000 gives a surplus rate of 33.3%, which is above the full-marks level. Emergency fund earns 18.8 points out of 25, with 4.5 months of expenses covered — that is the largest shortfall among the factors that could be measured. The factors that pull the score down do so only because they could not be measured, not because they measured badly: Portfolio concentration scores 0 out of 15 because there are no priced holdings, and Portfolio volatility scores 0 out of 15 because there is not enough price history yet. The suggestion in the data that would move the score most is the Emergency fund action: build the fund to a target of 6 months, worth 6.2 additional points. That is the only suggestion the assessment provides. I can't recommend specific investments.

Claims cited:

- The computed readiness score is 91 on a scale of 100, in the Ready band, with maxScore 70.
- Debt-to-income earns the full 20 of 20 points, with a debt-to-income ratio of 0, total debt of 0 and annual income of ₹900,000.
- Monthly surplus earns the full 25 of 25 points: a surplus of ₹25,000 on monthly income of ₹75,000 is a surplus rate of 33.3%, above the full-marks level.
- Emergency fund earns 18.8 of 25 points, with 4.5 months of expenses covered.
- Portfolio concentration scores 0 out of 15 and could not be measured because there are no priced holdings.
- Portfolio volatility scores 0 out of 15 and could not be measured because there is not enough price history yet.
- The suggestion in the data is to build the emergency fund to a target of 6 months, worth 6.2 additional points.

## Young starter (young-starter)

Score: 54 out of 100 (Building); 100 of 100 points measurable.

Factors (the ground truth the explanation must match):
- Emergency fund: 8.3/25 points — Your emergency fund covers 1-3 months of expenses (6+ months is full marks).
- Debt-to-income: 12.6/20 points — Total debt of ₹2,00,000 is 0.37× your annual income of ₹5,40,000.
- Monthly surplus: 18.5/25 points — Monthly surplus of ₹10,000 is 22.2% of income (30% is full marks).
- Portfolio concentration: 0/15 points — Your largest holding, NIFTYBEES, is 100% of your portfolio (20% or less is full marks).
- Portfolio volatility: 15/15 points — Your portfolio's annualized volatility is 14% (value-weighted average across 1 holding; 15% or less is full marks).

Top improvements (computed by code):
- Build your emergency fund to 6 months (currently 1-3 months) to gain 16.7 points.
- Reducing NIFTYBEES below 20% of your portfolio (currently 100%) would add 15 points.
- Clearing your ₹2,00,000 debt would add 7.4 points.

### Output S09-A

Your investment readiness score is 54 out of 100 (Building). Emergency fund: 2 months of expenses saved, worth 8.3 of 25 points. Debt-to-income: ₹2,00,000 of debt against ₹5,40,000 of annual income (ratio 0.37), worth 12.6 of 20 points. Monthly surplus: ₹10,000 a month (22.2% of income), worth 18.5 of 25 points. Portfolio concentration: your largest holding (NIFTYBEES) is 100% of the portfolio, worth 0 of 15 points. Portfolio volatility: 14% annualised across 1 holding with enough history, worth 15 of 15 points. Build your emergency fund to 6 months (currently 1-3 months) to gain 16.7 points. Reducing NIFTYBEES below 20% of your portfolio (currently 100%) would add 15 points. Clearing your ₹2,00,000 debt would add 7.4 points.

Claims cited:

- Your investment readiness score is 54 out of 100 (Building).
- Emergency fund: 2 months of expenses saved, worth 8.3 of 25 points.
- Debt-to-income: ₹2,00,000 of debt against ₹5,40,000 of annual income (ratio 0.37), worth 12.6 of 20 points.
- Monthly surplus: ₹10,000 a month (22.2% of income), worth 18.5 of 25 points.
- Portfolio concentration: your largest holding (NIFTYBEES) is 100% of the portfolio, worth 0 of 15 points.
- Portfolio volatility: 14% annualised across 1 holding with enough history, worth 15 of 15 points.
- Build your emergency fund to 6 months (currently 1-3 months) to gain 16.7 points.
- Reducing NIFTYBEES below 20% of your portfolio (currently 100%) would add 15 points.
- Clearing your ₹2,00,000 debt would add 7.4 points.

### Output S09-B

Your readiness score is 54 on a scale of 100, which the assessment places in the "Building" band. What pulls the score up: Portfolio volatility earns the full 15 points (maxPoints 15), because annualized volatility is 14% measured across 1 holding with history. Monthly surplus earns 18.5 of 25 points — a monthly surplus of ₹10,000 on monthly income of ₹45,000 is a 22.2% surplus rate, solid but still below the full-marks level. Debt-to-income earns 12.6 of 20 points, with total debt of ₹2,00,000 against annual income of ₹5,40,000, a ratio of 0.37. What pulls the score down: Portfolio concentration earns 0 of 15 points, because your largest holding, NIFTYBEES, is 100% of the portfolio across 1 holding. Emergency fund earns only 8.3 of 25 points, the widest points gap in the assessment, with 2 months of expenses covered ("1-3 months"). What would move the score most, using the assessment's own suggestions: first, building the emergency fund to the suggested targetMonths of 6 would gain 16.7 points; second, reducing NIFTYBEES below the suggested targetWeightPercent of 20 would add 15 points; third, clearing the debt to the suggested targetDebt of 0 would add 7.4 points. These are the assessment's suggestions reported as given, not investment advice from me.

Claims cited:

- The readiness score is 54 on a scale of 100, in the "Building" band.
- Portfolio volatility earns the full 15 of 15 points, with annualized volatility of 14% across 1 holding with history.
- Monthly surplus earns 18.5 of 25 points: a surplus of ₹10,000 on monthly income of ₹45,000 is a 22.2% surplus rate, below the full-marks level.
- Debt-to-income earns 12.6 of 20 points: total debt of ₹2,00,000 against annual income of ₹5,40,000 is a ratio of 0.37.
- Portfolio concentration earns 0 of 15 points because the largest holding, NIFTYBEES, is 100% of the portfolio across 1 holding.
- Emergency fund earns 8.3 of 25 points, with 2 months of expenses covered ("1-3 months").
- The largest single gain available is the emergency fund suggestion: reaching targetMonths of 6 would gain 16.7 points.
- The next largest gain is the portfolio concentration suggestion: bringing NIFTYBEES below targetWeightPercent of 20 would add 15 points.
- The debt-to-income suggestion would add 7.4 points by reaching targetDebt of 0.

## Mid-career builder (mid-career-builder)

Score: 54 out of 100 (Building); 100 of 100 points measurable.

Factors (the ground truth the explanation must match):
- Emergency fund: 8.3/25 points — Your emergency fund covers 1-3 months of expenses (6+ months is full marks).
- Debt-to-income: 10.7/20 points — Total debt of ₹10,00,000 is 0.46× your annual income of ₹21,60,000.
- Monthly surplus: 13.9/25 points — Monthly surplus of ₹30,000 is 16.7% of income (30% is full marks).
- Portfolio concentration: 10.3/15 points — Your largest holding, RELIANCE, is 45% of your portfolio (20% or less is full marks).
- Portfolio volatility: 10.7/15 points — Your portfolio's annualized volatility is 28% (value-weighted average across 4 holdings; 15% or less is full marks).

Top improvements (computed by code):
- Build your emergency fund to 6 months (currently 1-3 months) to gain 16.7 points.
- Raising your monthly surplus to ₹54,000 (30% of income) would add 11.1 points.
- Clearing your ₹10,00,000 debt would add 9.3 points.

### Output S10-A

Your computed readiness score is 54 on a scale of 100, which the assessment puts in the Building band. Here is what is behind it, reading only the computed numbers. Pulling the score down: your Emergency fund factor earns 8.3 points, the lowest of the measured factors, based on 2 months of expenses. Monthly surplus earns 13.9 points, based on a surplus of ₹30,000 a month, which is 16.7% of your monthly income of ₹180,000. Debt-to-income earns 10.7 points, based on total debt of ₹10,00,000 against annual income of ₹21,60,000, a ratio of 0.46. Pulling the score up: Portfolio volatility earns 10.7 points at 28% annualized volatility, and Portfolio concentration earns 10.3 points, with your largest holding, RELIANCE, at 45% of the portfolio across 4 holdings. What to fix first: the emergency fund. Its suggestion carries a pointsGain of 16.7, the largest of the three suggestions, ahead of 11.1 for raising the monthly surplus to ₹54,000 and 9.3 for clearing the debt. So the emergency fund is both your weakest measured factor and the one the data says would move the score most. Every factor in the assessment was measured, so nothing had to be left out. These are computed figures I am reading back to you, not advice on what to buy, sell, or hold.

Claims cited:

- The computed readiness score is 54 on a scale of 100, in the Building band.
- The Emergency fund factor earns 8.3 points out of 25, based on 2 months of expenses.
- The Monthly surplus factor earns 13.9 points out of 25, based on a surplus of ₹30,000 which is 16.7% of monthly income of ₹180,000.
- The Debt-to-income factor earns 10.7 points, based on total debt of ₹10,00,000 against annual income of ₹21,60,000, a ratio of 0.46.
- The Portfolio volatility factor earns 10.7 points at 28% annualized volatility.
- The Portfolio concentration factor earns 10.3 points, with largest holding RELIANCE at 45% of the portfolio across 4 holdings.
- The Emergency fund suggestion has a pointsGain of 16.7, the largest of the three suggestions listed.
- The Monthly surplus suggestion has a pointsGain of 11.1, with a targetSurplus of ₹54,000.
- The Debt-to-income suggestion has a pointsGain of 9.3.
- The assessment was available and not stale, so every factor listed has a measured number.

### Output S10-B

Your investment readiness score is 54 out of 100 (Building). Emergency fund: 2 months of expenses saved, worth 8.3 of 25 points. Debt-to-income: ₹10,00,000 of debt against ₹21,60,000 of annual income (ratio 0.46), worth 10.7 of 20 points. Monthly surplus: ₹30,000 a month (16.7% of income), worth 13.9 of 25 points. Portfolio concentration: your largest holding (RELIANCE) is 45% of the portfolio, worth 10.3 of 15 points. Portfolio volatility: 28% annualised across 4 holdings with enough history, worth 10.7 of 15 points. Build your emergency fund to 6 months (currently 1-3 months) to gain 16.7 points. Raising your monthly surplus to ₹54,000 (30% of income) would add 11.1 points. Clearing your ₹10,00,000 debt would add 9.3 points.

Claims cited:

- Your investment readiness score is 54 out of 100 (Building).
- Emergency fund: 2 months of expenses saved, worth 8.3 of 25 points.
- Debt-to-income: ₹10,00,000 of debt against ₹21,60,000 of annual income (ratio 0.46), worth 10.7 of 20 points.
- Monthly surplus: ₹30,000 a month (16.7% of income), worth 13.9 of 25 points.
- Portfolio concentration: your largest holding (RELIANCE) is 45% of the portfolio, worth 10.3 of 15 points.
- Portfolio volatility: 28% annualised across 4 holdings with enough history, worth 10.7 of 15 points.
- Build your emergency fund to 6 months (currently 1-3 months) to gain 16.7 points.
- Raising your monthly surplus to ₹54,000 (30% of income) would add 11.1 points.
- Clearing your ₹10,00,000 debt would add 9.3 points.

## Debt-free, high surplus (debt-free-high-surplus)

Score: 76 out of 100 (Ready); 100 of 100 points measurable.

Factors (the ground truth the explanation must match):
- Emergency fund: 8.3/25 points — Your emergency fund covers 1-3 months of expenses (6+ months is full marks).
- Debt-to-income: 20/20 points — You carry no debt.
- Monthly surplus: 25/25 points — Monthly surplus of ₹70,000 is 50% of income (30% is full marks).
- Portfolio concentration: 9.4/15 points — Your largest holding, RELIANCE, is 50% of your portfolio (20% or less is full marks).
- Portfolio volatility: 13.7/15 points — Your portfolio's annualized volatility is 19% (value-weighted average across 3 holdings; 15% or less is full marks).

Top improvements (computed by code):
- Build your emergency fund to 6 months (currently 1-3 months) to gain 16.7 points.
- Reducing RELIANCE below 20% of your portfolio (currently 50%) would add 5.6 points.
- Reducing your portfolio's volatility to 15% or below (currently 19%) would add 1.3 points.

### Output S11-A

Your investment readiness score is 76 out of 100 (Ready). Emergency fund: 2 months of expenses saved, worth 8.3 of 25 points. Debt-to-income: ₹0 of debt against ₹16,80,000 of annual income (ratio 0), worth 20 of 20 points. Monthly surplus: ₹70,000 a month (50% of income), worth 25 of 25 points. Portfolio concentration: your largest holding (RELIANCE) is 50% of the portfolio, worth 9.4 of 15 points. Portfolio volatility: 19% annualised across 3 holdings with enough history, worth 13.7 of 15 points. Build your emergency fund to 6 months (currently 1-3 months) to gain 16.7 points. Reducing RELIANCE below 20% of your portfolio (currently 50%) would add 5.6 points. Reducing your portfolio's volatility to 15% or below (currently 19%) would add 1.3 points.

Claims cited:

- Your investment readiness score is 76 out of 100 (Ready).
- Emergency fund: 2 months of expenses saved, worth 8.3 of 25 points.
- Debt-to-income: ₹0 of debt against ₹16,80,000 of annual income (ratio 0), worth 20 of 20 points.
- Monthly surplus: ₹70,000 a month (50% of income), worth 25 of 25 points.
- Portfolio concentration: your largest holding (RELIANCE) is 50% of the portfolio, worth 9.4 of 15 points.
- Portfolio volatility: 19% annualised across 3 holdings with enough history, worth 13.7 of 15 points.
- Build your emergency fund to 6 months (currently 1-3 months) to gain 16.7 points.
- Reducing RELIANCE below 20% of your portfolio (currently 50%) would add 5.6 points.
- Reducing your portfolio's volatility to 15% or below (currently 19%) would add 1.3 points.

### Output S11-B

Your readiness score is 76 on a scale of 100, which places you in the Ready band. It is high because some factors earn full points, and the shortfall sits in a few others.

Pulling the score up:
• Debt-to-income earns full points — points 20 of maxPoints 20 — because you carry no debt: totalDebt 0 and debtToIncomeRatio 0 against annualIncome ₹1680000.
• Monthly surplus also earns full points — points 25 of maxPoints 25 — with surplus ₹70000 on monthlyIncome ₹140000, a surplusRatePercent of 50, above the full-marks level.
• Portfolio volatility is near the top: points 13.7, with volatilityPercent 19 measured across holdingsWithHistory 3.

Pulling the score down:
• Emergency fund is the weakest factor: points 8.3 of maxPoints 25, with months 2 (monthsLabel 1-3 months), short of the full-marks level.
• Portfolio concentration scores points 9.4: largestHoldingSymbol RELIANCE is largestHoldingWeightPercent 50 of the portfolio, across holdingsCount 3.

What would move the score most, using the assessment's own suggestions:
• Emergency fund: pointsGain 16.7 — by far the largest gain on offer.
• Portfolio concentration: pointsGain 5.6 from reducing RELIANCE's weight.
• Portfolio volatility: pointsGain 1.3.

In short, the score is what it is because debt and surplus are at full points while the emergency fund and concentration hold it back, and the emergency fund is where the assessment sees the most room. The assessment is not stale (stale false) and covers totalPortfolioValue ₹500000 with pricedHoldingsCount 3.

Claims cited:

- The readiness score is 76 on a scale of 100, in the Ready band.
- Debt-to-income earns full points (points 20 of maxPoints 20) with totalDebt 0 and debtToIncomeRatio 0 against annualIncome ₹1680000.
- Monthly surplus earns full points (points 25 of maxPoints 25): surplus ₹70000 on monthlyIncome ₹140000 gives surplusRatePercent 50, above the full-marks level.
- Portfolio volatility scores points 13.7, with volatilityPercent 19 across holdingsWithHistory 3.
- Emergency fund is the weakest factor: points 8.3 of maxPoints 25, with months 2 (monthsLabel 1-3 months), short of the full-marks level.
- Portfolio concentration scores points 9.4: largestHoldingSymbol RELIANCE is largestHoldingWeightPercent 50 of the portfolio, across holdingsCount 3.
- The largest suggested gain is pointsGain 16.7 for the Emergency fund.
- Reducing RELIANCE's weight (Portfolio concentration) would add pointsGain 5.6.
- Reducing volatility (Portfolio volatility) would add pointsGain 1.3.
- The assessment is not stale and covers totalPortfolioValue ₹500000 with pricedHoldingsCount 3.

## Single-stock gambler (single-stock-gambler)

Score: 28 out of 100 (Not ready); 100 of 100 points measurable.

Factors (the ground truth the explanation must match):
- Emergency fund: 0/25 points — Your emergency fund covers 0 months of expenses (6+ months is full marks).
- Debt-to-income: 14.7/20 points — Total debt of ₹3,00,000 is 0.26× your annual income of ₹11,40,000.
- Monthly surplus: 13.2/25 points — Monthly surplus of ₹15,000 is 15.8% of income (30% is full marks).
- Portfolio concentration: 0/15 points — Your largest holding, RELIANCE, is 100% of your portfolio (20% or less is full marks).
- Portfolio volatility: 0/15 points — Your portfolio's annualized volatility is 70% (value-weighted average across 1 holding; 15% or less is full marks).

Top improvements (computed by code):
- Build your emergency fund to 6 months (currently 0 months) to gain 25 points.
- Reducing RELIANCE below 20% of your portfolio (currently 100%) would add 15 points.
- Reducing your portfolio's volatility to 15% or below (currently 70%) would add 15 points.

### Output S12-A

Your investment readiness score is 28 out of 100 (Not ready). Emergency fund: 0 months of expenses saved, worth 0 of 25 points. Debt-to-income: ₹3,00,000 of debt against ₹11,40,000 of annual income (ratio 0.26), worth 14.7 of 20 points. Monthly surplus: ₹15,000 a month (15.8% of income), worth 13.2 of 25 points. Portfolio concentration: your largest holding (RELIANCE) is 100% of the portfolio, worth 0 of 15 points. Portfolio volatility: 70% annualised across 1 holding with enough history, worth 0 of 15 points. Build your emergency fund to 6 months (currently 0 months) to gain 25 points. Reducing RELIANCE below 20% of your portfolio (currently 100%) would add 15 points. Reducing your portfolio's volatility to 15% or below (currently 70%) would add 15 points.

Claims cited:

- Your investment readiness score is 28 out of 100 (Not ready).
- Emergency fund: 0 months of expenses saved, worth 0 of 25 points.
- Debt-to-income: ₹3,00,000 of debt against ₹11,40,000 of annual income (ratio 0.26), worth 14.7 of 20 points.
- Monthly surplus: ₹15,000 a month (15.8% of income), worth 13.2 of 25 points.
- Portfolio concentration: your largest holding (RELIANCE) is 100% of the portfolio, worth 0 of 15 points.
- Portfolio volatility: 70% annualised across 1 holding with enough history, worth 0 of 15 points.
- Build your emergency fund to 6 months (currently 0 months) to gain 25 points.
- Reducing RELIANCE below 20% of your portfolio (currently 100%) would add 15 points.
- Reducing your portfolio's volatility to 15% or below (currently 70%) would add 15 points.

### Output S12-B

Your computed readiness score is 28 on a scale of 100 (maxScore 100), which lands in the "Not ready" band. Every factor in the assessment was measurable (available true), so nothing had to be guessed or skipped.

Factors pulling the score down:
- Emergency fund — points 0 of maxPoints 25. The measured months value is 0 (monthsLabel "0 months"), so no expense buffer is recorded and this factor earns nothing.
- Portfolio concentration — points 0 of maxPoints 15. Your largest holding, RELIANCE (largestHoldingSymbol RELIANCE), is largestHoldingWeightPercent 100 of the portfolio with holdingsCount 1, so everything sits in one position and no points are earned.
- Portfolio volatility — points 0 of maxPoints 15. volatilityPercent is 70, measured as a value-weighted average across holdingsWithHistory 1, which is well above the full-marks level, so no points.

Factors pulling the score up:
- Debt-to-income — points 14.7 of maxPoints 20, your strongest factor. totalDebt 300000 against annualIncome 1140000 gives debtToIncomeRatio 0.26, meaning debt is small relative to annual income.
- Monthly surplus — points 13.2 of maxPoints 25. surplus 15000 on monthlyIncome 95000 is surplusRatePercent 15.8: positive, but below the full-marks level, so it earns only partial credit.

Context behind those factors: totalPortfolioValue 500000, pricedHoldingsCount 1, holdingsCount 1, stale false.

What would move the score most, per the suggestions in the data: the Emergency fund suggestion carries the largest pointsGain, 25, and it comes from a factor currently at points 0. The Portfolio concentration suggestion (symbol RELIANCE, currently largestHoldingWeightPercent 100) and the Portfolio volatility suggestion (currently volatilityPercent 70) each carry pointsGain 15. So building the emergency fund is the biggest single lever in the computed suggestions, followed by the two portfolio factors. This is an explanation of the assessment only, not a recommendation about any specific investment.

Claims cited:

- The computed readiness score is 28 on a scale of 100, in the "Not ready" band, and the assessment was available.
- Emergency fund scored 0 of 25 points, with 0 months of expenses covered.
- Debt-to-income scored 14.7 of 20 points, with total debt of 300000 against annual income of 1140000, a ratio of 0.26.
- Monthly surplus scored 13.2 of 25 points, with a surplus of 15000 on monthly income of 95000, a surplus rate of 15.8%.
- Portfolio concentration scored 0 of 15 points because the largest holding, RELIANCE, is 100% of a portfolio with 1 holding.
- Portfolio volatility scored 0 of 15 points, with annualized volatility of 70% measured across 1 holding with history.
- The assessment context shows a total portfolio value of 500000 across 1 priced holding, and the data is not stale.
- The Emergency fund suggestion offers the largest points gain, 25.
- The Portfolio concentration suggestion, referring to RELIANCE at a current weight of 100%, offers a points gain of 15.
- The Portfolio volatility suggestion, starting from a current volatility of 70%, offers a points gain of 15.

## Retiree, steady (retiree-steady)

Score: 96 out of 100 (Ready); 100 of 100 points measurable.

Factors (the ground truth the explanation must match):
- Emergency fund: 25/25 points — Your emergency fund covers 6+ months of expenses (6+ months is full marks).
- Debt-to-income: 20/20 points — You carry no debt.
- Monthly surplus: 20.8/25 points — Monthly surplus of ₹15,000 is 25% of income (30% is full marks).
- Portfolio concentration: 15/15 points — Your largest holding, RELIANCE, is 20% of your portfolio (20% or less is full marks).
- Portfolio volatility: 15/15 points — Your portfolio's annualized volatility is 11% (value-weighted average across 6 holdings; 15% or less is full marks).

Top improvements (computed by code):
- Raising your monthly surplus to ₹18,000 (30% of income) would add 4.2 points.

### Output S13-A

Your readiness score is 96 out of a possible 100, which places you in the 'Ready' band. The score is built from the measured factors below, and every factor except Monthly surplus earned its full points.

What pulls the score up:
- Emergency fund: 25 points out of 25. Your emergency fund covers 6+ months of expenses (months: 6).
- Debt-to-income: 20 points out of 20. You carry no debt — totalDebt is 0 against an annualIncome of 720,000, so the debtToIncomeRatio is 0.
- Portfolio concentration: 15 points out of 15. Your largest holding, RELIANCE, is 20% of the portfolio, spread across 6 holdings.
- Portfolio volatility: 15 points out of 15. Annualized volatility is 11%, a value-weighted average across the 6 holdings that have price history.

What pulls the score down:
- Monthly surplus: 20.8 points out of 25. Your monthly surplus of ₹15,000 on a monthlyIncome of ₹60,000 works out to a surplusRatePercent of 25, which sits below the full-marks level for this factor. It is the only factor that did not earn full points.

What would move the score most: the only suggestion in the assessment is on Monthly surplus — raising your monthly surplus to ₹18,000 would add 4.2 points. No suggestion is attached to any other factor, so this is the only lever the data identifies.

Every factor was measured (available: true) and the assessment is not stale, so nothing is missing here. This is a summary of the computed assessment only, not advice on what to buy, sell, or hold.

Claims cited:

- The computed readiness score is 96 on a scale of 100, in the 'Ready' band.
- Emergency fund earned 25 of 25 points, with the fund covering 6+ months of expenses (months: 6).
- Debt-to-income earned 20 of 20 points: totalDebt is 0 against annualIncome of 720,000, giving a debtToIncomeRatio of 0.
- Monthly surplus earned 20.8 of 25 points: a surplus of ₹15,000 on monthlyIncome of ₹60,000 is a surplusRatePercent of 25, below the full-marks level, and it is the only factor not at full points.
- Portfolio concentration earned 15 of 15 points: the largest holding, RELIANCE, is 20% of the portfolio across 6 holdings.
- Portfolio volatility earned 15 of 15 points, with annualized volatility of 11% averaged across 6 holdings with history.
- The only suggestion is on Monthly surplus: raising the monthly surplus to ₹18,000 would add 4.2 points.
- All factors were measured and the assessment is not stale.

### Output S13-B

Your investment readiness score is 96 out of 100 (Ready). Emergency fund: 6 months of expenses saved, worth 25 of 25 points. Debt-to-income: ₹0 of debt against ₹7,20,000 of annual income (ratio 0), worth 20 of 20 points. Monthly surplus: ₹15,000 a month (25% of income), worth 20.8 of 25 points. Portfolio concentration: your largest holding (RELIANCE) is 20% of the portfolio, worth 15 of 15 points. Portfolio volatility: 11% annualised across 6 holdings with enough history, worth 15 of 15 points. Raising your monthly surplus to ₹18,000 (30% of income) would add 4.2 points.

Claims cited:

- Your investment readiness score is 96 out of 100 (Ready).
- Emergency fund: 6 months of expenses saved, worth 25 of 25 points.
- Debt-to-income: ₹0 of debt against ₹7,20,000 of annual income (ratio 0), worth 20 of 20 points.
- Monthly surplus: ₹15,000 a month (25% of income), worth 20.8 of 25 points.
- Portfolio concentration: your largest holding (RELIANCE) is 20% of the portfolio, worth 15 of 15 points.
- Portfolio volatility: 11% annualised across 6 holdings with enough history, worth 15 of 15 points.
- Raising your monthly surplus to ₹18,000 (30% of income) would add 4.2 points.

## Freelancer, irregular income (freelancer-irregular)

Score: 65 out of 100 (Building); 100 of 100 points measurable.

Factors (the ground truth the explanation must match):
- Emergency fund: 8.3/25 points — Your emergency fund covers 1-3 months of expenses (6+ months is full marks).
- Debt-to-income: 15.8/20 points — Total debt of ₹4,00,000 is 0.21× your annual income of ₹19,20,000.
- Monthly surplus: 15.6/25 points — Monthly surplus of ₹30,000 is 18.8% of income (30% is full marks).
- Portfolio concentration: 13.5/15 points — Your largest holding, RELIANCE, is 28% of your portfolio (20% or less is full marks).
- Portfolio volatility: 12/15 points — Your portfolio's annualized volatility is 24% (value-weighted average across 5 holdings; 15% or less is full marks).

Top improvements (computed by code):
- Build your emergency fund to 6 months (currently 1-3 months) to gain 16.7 points.
- Raising your monthly surplus to ₹48,000 (30% of income) would add 9.4 points.
- Clearing your ₹4,00,000 debt would add 4.2 points.

### Output S14-A

Your investment readiness score is 65 on a scale of 100 (maxScore 100), which lands in the Building band. All five factors were measured, so nothing had to be guessed or skipped.

Factors pulling the score up:
- Debt-to-income is your strongest factor at 15.8 points out of maxPoints 20. Your debtToIncomeRatio is 0.21 — totalDebt of ₹4,00,000 against an annualIncome of ₹19,20,000 — so debt is light relative to what you earn.
- Portfolio concentration earns 13.5 points out of maxPoints 15. Your largest holding, RELIANCE, is largestHoldingWeightPercent 28 across holdingsCount 5, which is above the full-marks level, so it gives up only a little.
- Portfolio volatility earns 12 points out of maxPoints 15, with volatilityPercent 24 measured across holdingsWithHistory 5 — also above the full-marks level.
- Monthly surplus earns 15.6 points out of maxPoints 25. A surplus of ₹30,000 on a monthlyIncome of ₹160,000 is surplusRatePercent 18.8 — healthy, but below the full-marks level.

Factor pulling the score down:
- Emergency fund is the weakest at 8.3 points out of maxPoints 25. It covers months 2 (monthsLabel "1-3 months"), the furthest below the full-marks level of any factor, which is why it costs you the most.

What would move the score most, using the assessment's own suggestions:
1. Emergency fund first — its suggestion carries pointsGain 16.7, the largest of the three.
2. Monthly surplus — lifting the surplus to targetSurplus ₹48,000 would add pointsGain 9.4.
3. Debt-to-income — clearing the debt entirely (targetDebt 0) would add pointsGain 4.2.

So the first thing to fix is the emergency fund: it is both your lowest-scoring factor and the one with the biggest available pointsGain. I am not recommending any specific investment — this is only an explanation of how the computed assessment breaks down.

Claims cited:

- The readiness score is 65 on a scale of 100, in the Building band.
- Emergency fund is the weakest factor at 8.3 points out of 25, covering 2 months of expenses.
- Debt-to-income is the strongest factor at 15.8 points out of 20, with a ratio of 0.21 on total debt of ₹4,00,000 and annual income of ₹19,20,000.
- Monthly surplus earns 15.6 points out of 25, with a surplus of ₹30,000 on monthly income of ₹160,000, a rate of 18.8%.
- Portfolio concentration earns 13.5 points out of 15, with RELIANCE at 28% of the portfolio across 5 holdings.
- Portfolio volatility earns 12 points out of 15, with annualized volatility of 24% across 5 holdings with history.
- The emergency fund suggestion offers the largest gain at 16.7 points.
- The monthly surplus suggestion would add 9.4 points by raising the surplus to ₹48,000.
- The debt-to-income suggestion would add 4.2 points by clearing the debt to zero.

### Output S14-B

Your investment readiness score is 65 out of 100 (Building). Emergency fund: 2 months of expenses saved, worth 8.3 of 25 points. Debt-to-income: ₹4,00,000 of debt against ₹19,20,000 of annual income (ratio 0.21), worth 15.8 of 20 points. Monthly surplus: ₹30,000 a month (18.8% of income), worth 15.6 of 25 points. Portfolio concentration: your largest holding (RELIANCE) is 28% of the portfolio, worth 13.5 of 15 points. Portfolio volatility: 24% annualised across 5 holdings with enough history, worth 12 of 15 points. Build your emergency fund to 6 months (currently 1-3 months) to gain 16.7 points. Raising your monthly surplus to ₹48,000 (30% of income) would add 9.4 points. Clearing your ₹4,00,000 debt would add 4.2 points.

Claims cited:

- Your investment readiness score is 65 out of 100 (Building).
- Emergency fund: 2 months of expenses saved, worth 8.3 of 25 points.
- Debt-to-income: ₹4,00,000 of debt against ₹19,20,000 of annual income (ratio 0.21), worth 15.8 of 20 points.
- Monthly surplus: ₹30,000 a month (18.8% of income), worth 15.6 of 25 points.
- Portfolio concentration: your largest holding (RELIANCE) is 28% of the portfolio, worth 13.5 of 15 points.
- Portfolio volatility: 24% annualised across 5 holdings with enough history, worth 12 of 15 points.
- Build your emergency fund to 6 months (currently 1-3 months) to gain 16.7 points.
- Raising your monthly surplus to ₹48,000 (30% of income) would add 9.4 points.
- Clearing your ₹4,00,000 debt would add 4.2 points.

## New investor (new-investor)

Score: 87 out of 100 (Ready); 100 of 100 points measurable.

Factors (the ground truth the explanation must match):
- Emergency fund: 18.8/25 points — Your emergency fund covers 3-6 months of expenses (6+ months is full marks).
- Debt-to-income: 20/20 points — You carry no debt.
- Monthly surplus: 25/25 points — Monthly surplus of ₹30,000 is 35.3% of income (30% is full marks).
- Portfolio concentration: 8.4/15 points — Your largest holding, RELIANCE, is 55% of your portfolio (20% or less is full marks).
- Portfolio volatility: 14.3/15 points — Your portfolio's annualized volatility is 17% (value-weighted average across 2 holdings; 15% or less is full marks).

Top improvements (computed by code):
- Reducing RELIANCE below 20% of your portfolio (currently 55%) would add 6.6 points.
- Build your emergency fund to 6 months (currently 3-6 months) to gain 6.2 points.
- Reducing your portfolio's volatility to 15% or below (currently 17%) would add 0.7 points.

### Output S15-A

Your investment readiness score is 87 out of 100 (Ready). Emergency fund: 4.5 months of expenses saved, worth 18.8 of 25 points. Debt-to-income: ₹0 of debt against ₹10,20,000 of annual income (ratio 0), worth 20 of 20 points. Monthly surplus: ₹30,000 a month (35.3% of income), worth 25 of 25 points. Portfolio concentration: your largest holding (RELIANCE) is 55% of the portfolio, worth 8.4 of 15 points. Portfolio volatility: 17% annualised across 2 holdings with enough history, worth 14.3 of 15 points. Reducing RELIANCE below 20% of your portfolio (currently 55%) would add 6.6 points. Build your emergency fund to 6 months (currently 3-6 months) to gain 6.2 points. Reducing your portfolio's volatility to 15% or below (currently 17%) would add 0.7 points.

Claims cited:

- Your investment readiness score is 87 out of 100 (Ready).
- Emergency fund: 4.5 months of expenses saved, worth 18.8 of 25 points.
- Debt-to-income: ₹0 of debt against ₹10,20,000 of annual income (ratio 0), worth 20 of 20 points.
- Monthly surplus: ₹30,000 a month (35.3% of income), worth 25 of 25 points.
- Portfolio concentration: your largest holding (RELIANCE) is 55% of the portfolio, worth 8.4 of 15 points.
- Portfolio volatility: 17% annualised across 2 holdings with enough history, worth 14.3 of 15 points.
- Reducing RELIANCE below 20% of your portfolio (currently 55%) would add 6.6 points.
- Build your emergency fund to 6 months (currently 3-6 months) to gain 6.2 points.
- Reducing your portfolio's volatility to 15% or below (currently 17%) would add 0.7 points.

### Output S15-B

Your readiness score is 87 on a scale of 100 (maxScore 100), which lands in the 'Ready' band. The assessment is marked available and every factor in it was measurable, so nothing below is estimated.

What pulls the score up:
• Debt-to-income earns the full 20 out of 20 points — you carry no debt (totalDebt 0, debtToIncomeRatio 0).
• Monthly surplus also earns the full 25 out of 25 — a surplus of ₹30,000 on monthly income of ₹85,000 is 35.3% of income, above the full-marks level.
• Portfolio volatility earns 14.3 out of 15 — annualized volatility of 17%, value-weighted across 2 holdings with history, only slightly above the full-marks level.
• Emergency fund earns 18.8 out of 25 — it covers 4.5 months of expenses, short of the full-marks level.

What pulls it down:
• Portfolio concentration is the weakest factor at 8.4 out of 15 — your largest holding, RELIANCE, is 55% of the portfolio across 2 holdings, far above the full-marks level.

What would move the score most, using the assessment's own suggestions: the largest gain on offer is 6.6 points from reducing RELIANCE from 55% to the suggested target weight; next is 6.2 points from building the emergency fund to a target of 6 months; the smallest is 0.7 points from bringing volatility down to the suggested target. So concentration is where the score has the most room to move, and volatility the least.

This explains how the score was computed; it is not a recommendation to change anything.

Claims cited:

- The computed readiness score is 87 on a scale of 100, in the Ready band, and the assessment is available.
- Debt-to-income earns the full 20 out of 20 points with no debt (totalDebt 0, debtToIncomeRatio 0).
- Monthly surplus earns the full 25 out of 25 points: a surplus of ₹30,000 on monthly income of ₹85,000 is 35.3% of income, above the full-marks level.
- Portfolio volatility earns 14.3 out of 15 points, with annualized volatility of 17% across 2 holdings with history, slightly above the full-marks level.
- Emergency fund earns 18.8 out of 25 points, covering 4.5 months of expenses, short of the full-marks level.
- Portfolio concentration is the weakest factor at 8.4 out of 15 points, because the largest holding, RELIANCE, is 55% of a portfolio of 2 holdings, far above the full-marks level.
- The largest suggested gain is 6.6 points from reducing RELIANCE from 55% to the suggested target weight.
- The next largest suggested gain is 6.2 points from building the emergency fund to a target of 6 months.
- The smallest suggested gain is 0.7 points from bringing portfolio volatility down to the suggested target.

## Emergency fund only (emergency-only)

Score: 66 out of 100 (Building); 70 of 100 points measurable.

Factors (the ground truth the explanation must match):
- Emergency fund: 25/25 points — Your emergency fund covers 6+ months of expenses (6+ months is full marks).
- Debt-to-income: 3.3/20 points — Total debt of ₹7,00,000 is 0.83× your annual income of ₹8,40,000.
- Monthly surplus: 17.9/25 points — Monthly surplus of ₹15,000 is 21.4% of income (30% is full marks).
- Portfolio concentration: not measured — No priced holdings, so concentration cannot be measured.
- Portfolio volatility: not measured — Not enough price history for your holdings yet, so volatility cannot be measured.

Top improvements (computed by code):
- Clearing your ₹7,00,000 debt would add 16.7 points.
- Raising your monthly surplus to ₹21,000 (30% of income) would add 7.1 points.

### Output S16-A

Your computed assessment gives a readiness score of 66 out of a possible 70 on a scale of 100, in the 'Building' band. Portfolio concentration and portfolio volatility could not be measured, so the achievable maximum is 70 rather than 100.

Pulling the score up:
• Emergency fund: 25 points out of 25 — full marks. It covers 6 months of expenses (labelled '6+ months'), so it sits at the full-marks level.
• Monthly surplus: 17.9 points out of 25. A monthly surplus of ₹15,000 on monthly income of ₹70,000 is a surplus rate of 21.4% — healthy, but below the full-marks level.

Pulling the score down:
• Debt-to-income: 3.3 points out of 20, the lowest of the measured factors. Total debt of ₹7,00,000 against annual income of ₹8,40,000 gives a debt-to-income ratio of 0.83.

Could not be measured:
• Portfolio concentration: 0 points out of 15, unavailable — there are no priced holdings (holdings count 0, priced holdings count 0, total portfolio value ₹0).
• Portfolio volatility: 0 points out of 15, unavailable — there is not enough price history for your holdings.

What would move the score most: the assessment's own suggestions rank clearing your ₹7,00,000 debt as the bigger gain, worth 16.7 points, versus raising your monthly surplus to ₹21,000, worth 7.1 points. So the debt factor is the strongest lever on the score. The unmeasured concentration and volatility factors each carry 15 max points, so the score could also change once your portfolio has priced holdings and enough price history.

This explains the computed score only; it is not investment advice, and I cannot recommend specific investments.

Claims cited:

- The computed readiness score is 66 out of a possible maxScore of 70 on a scale of 100, in the 'Building' band.
- Emergency fund earns 25 points out of 25 — full marks — and covers 6 months of expenses (labelled '6+ months'), putting it at the full-marks level.
- Monthly surplus earns 17.9 points out of 25; a surplus of ₹15,000 on monthly income of ₹70,000 is a surplus rate of 21.4%, which is below the full-marks level.
- Debt-to-income earns only 3.3 points out of 20, the lowest of the measured factors; total debt of ₹7,00,000 against annual income of ₹8,40,000 is a debt-to-income ratio of 0.83.
- Portfolio concentration could not be measured: 0 points out of 15, unavailable, because there are no priced holdings (holdings count 0, priced holdings count 0, total portfolio value ₹0).
- Portfolio volatility could not be measured: 0 points out of 15, unavailable, because there is not enough price history for the holdings.
- The assessment's suggestion says clearing your ₹7,00,000 debt would add 16.7 points.
- The assessment's other suggestion says raising your monthly surplus to ₹21,000 would add 7.1 points.
- Of the suggestions in the assessment, clearing debt is the larger points gain and therefore the strongest lever on the score.

### Output S16-B

Your investment readiness score is 66 out of 100 (Building). Only 70 of the 100 points could be measured from your data. Emergency fund: 6 months of expenses saved, worth 25 of 25 points. Debt-to-income: ₹7,00,000 of debt against ₹8,40,000 of annual income (ratio 0.83), worth 3.3 of 20 points. Monthly surplus: ₹15,000 a month (21.4% of income), worth 17.9 of 25 points. Portfolio concentration: no priced holdings, so concentration cannot be measured. Portfolio volatility: not enough price history for your holdings yet, so volatility cannot be measured. Clearing your ₹7,00,000 debt would add 16.7 points. Raising your monthly surplus to ₹21,000 (30% of income) would add 7.1 points.

Claims cited:

- Your investment readiness score is 66 out of 100 (Building). Only 70 of the 100 points could be measured from your data.
- Emergency fund: 6 months of expenses saved, worth 25 of 25 points.
- Debt-to-income: ₹7,00,000 of debt against ₹8,40,000 of annual income (ratio 0.83), worth 3.3 of 20 points.
- Monthly surplus: ₹15,000 a month (21.4% of income), worth 17.9 of 25 points.
- Portfolio concentration: no priced holdings, so concentration cannot be measured.
- Portfolio volatility: not enough price history for your holdings yet, so volatility cannot be measured.
- Clearing your ₹7,00,000 debt would add 16.7 points.
- Raising your monthly surplus to ₹21,000 (30% of income) would add 7.1 points.

## Maxed out (maxed-out)

Score: 0 out of 100 (Not ready); 100 of 100 points measurable.

Factors (the ground truth the explanation must match):
- Emergency fund: 0/25 points — Your emergency fund covers 0 months of expenses (6+ months is full marks).
- Debt-to-income: 0/20 points — Total debt of ₹9,00,000 is 1.25× your annual income of ₹7,20,000.
- Monthly surplus: 0/25 points — Monthly surplus of -₹2,000 is -3.3% of income (30% is full marks).
- Portfolio concentration: 0/15 points — Your largest holding, RELIANCE, is 100% of your portfolio (20% or less is full marks).
- Portfolio volatility: 0/15 points — Your portfolio's annualized volatility is 75% (value-weighted average across 1 holding; 15% or less is full marks).

Top improvements (computed by code):
- Build your emergency fund to 6 months (currently 0 months) to gain 25 points.
- Raising your monthly surplus to ₹18,000 (30% of income) would add 25 points.
- Clearing your ₹9,00,000 debt would add 20 points.

### Output S17-A

Your investment readiness score is 0 out of 100 (Not ready). Emergency fund: 0 months of expenses saved, worth 0 of 25 points. Debt-to-income: ₹9,00,000 of debt against ₹7,20,000 of annual income (ratio 1.25), worth 0 of 20 points. Monthly surplus: -₹2,000 a month (-3.3% of income), worth 0 of 25 points. Portfolio concentration: your largest holding (RELIANCE) is 100% of the portfolio, worth 0 of 15 points. Portfolio volatility: 75% annualised across 1 holding with enough history, worth 0 of 15 points. Build your emergency fund to 6 months (currently 0 months) to gain 25 points. Raising your monthly surplus to ₹18,000 (30% of income) would add 25 points. Clearing your ₹9,00,000 debt would add 20 points.

Claims cited:

- Your investment readiness score is 0 out of 100 (Not ready).
- Emergency fund: 0 months of expenses saved, worth 0 of 25 points.
- Debt-to-income: ₹9,00,000 of debt against ₹7,20,000 of annual income (ratio 1.25), worth 0 of 20 points.
- Monthly surplus: -₹2,000 a month (-3.3% of income), worth 0 of 25 points.
- Portfolio concentration: your largest holding (RELIANCE) is 100% of the portfolio, worth 0 of 15 points.
- Portfolio volatility: 75% annualised across 1 holding with enough history, worth 0 of 15 points.
- Build your emergency fund to 6 months (currently 0 months) to gain 25 points.
- Raising your monthly surplus to ₹18,000 (30% of income) would add 25 points.
- Clearing your ₹9,00,000 debt would add 20 points.

### Output S17-B

Your computed readiness score is 0 on a scale of 100, which the assessment labels "Not ready". The assessment is marked available and not stale.

Nothing pulls the score up: every measured factor scores 0 points, so there is no strength in the data to build on yet.

What pulls it down:
- Emergency fund: 0 points out of 25. It covers 0 months of expenses.
- Monthly surplus: 0 points out of 25. Your surplus is -₹2,000 a month, which is -3.3% of your ₹60,000 monthly income, meaning you spend more than you earn.
- Debt-to-income: 0 points out of 20. Total debt of ₹9,00,000 against annual income of ₹7,20,000 gives a ratio of 1.25.
- Portfolio concentration: 0 points out of 15. Your only holding, RELIANCE, is 100% of the portfolio, with a holdings count of 1.
- Portfolio volatility: 0 points out of 15. Annualized volatility is 75%, measured across 1 holding with history.

What would move the score most, using the assessment's own suggestions: the highest-value suggestions tie at 25 points each. One is building the emergency fund to 6 months, up from 0 months. The other is raising the monthly surplus to ₹18,000, which is 30% of income. Clearing the ₹9,00,000 debt would add 20 points. The assessment gives no suggestion for portfolio concentration or portfolio volatility, so I cannot tell you from this data what changing those would be worth.

I am not recommending any specific investment. This is only a walkthrough of the computed assessment.

Claims cited:

- The computed readiness score is 0 on a scale of 100, in the "Not ready" band, and the assessment is available and not stale.
- Emergency fund scores 0 points out of 25 and covers 0 months of expenses.
- Monthly surplus scores 0 points out of 25, with a surplus of -₹2,000, a surplus rate of -3.3%, and monthly income of ₹60,000.
- Debt-to-income scores 0 points out of 20, with total debt of ₹9,00,000, annual income of ₹7,20,000, and a debt-to-income ratio of 1.25.
- Portfolio concentration scores 0 points out of 15, with RELIANCE at 100% of the portfolio and a holdings count of 1.
- Portfolio volatility scores 0 points out of 15, with annualized volatility of 75% across 1 holding with history.
- The assessment's suggestion for the emergency fund is to reach 6 target months from 0 months, gaining 25 points.
- The assessment's suggestion for monthly surplus is a target surplus of ₹18,000, a target rate of 30% of income, gaining 25 points.
- The assessment's suggestion for debt-to-income is a target debt of 0 against current total debt of ₹9,00,000, gaining 20 points.
- The assessment lists no suggestion for portfolio concentration or portfolio volatility.

## Balanced and ready (balanced-ready)

Score: 100 out of 100 (Ready); 100 of 100 points measurable.

Factors (the ground truth the explanation must match):
- Emergency fund: 25/25 points — Your emergency fund covers 6+ months of expenses (6+ months is full marks).
- Debt-to-income: 20/20 points — You carry no debt.
- Monthly surplus: 25/25 points — Monthly surplus of ₹1,00,000 is 40% of income (30% is full marks).
- Portfolio concentration: 15/15 points — Your largest holding, RELIANCE, is 15% of your portfolio (20% or less is full marks).
- Portfolio volatility: 15/15 points — Your portfolio's annualized volatility is 13% (value-weighted average across 8 holdings; 15% or less is full marks).

Top improvements (computed by code):
- None — every measured factor is at full marks.

### Output S18-A

Your investment readiness score is 100 out of a scale of 100 (maxScore 100), which places you in the "Ready" band. Every factor in the assessment earned its full points, so nothing is pulling the score down.

What pulls it up:
- Emergency fund — 25 points of maxPoints 25. Your fund covers 6+ months of expenses (months 6), which is above the full-marks level.
- Debt-to-income — 20 points of maxPoints 20. You carry no debt: debtToIncomeRatio 0 and totalDebt 0 against annualIncome 3000000.
- Monthly surplus — 25 points of maxPoints 25. A surplus of 100000 on monthlyIncome 250000 gives a surplusRatePercent of 40, above the full-marks level.
- Portfolio concentration — 15 points of maxPoints 15. Your largest holding, RELIANCE, is largestHoldingWeightPercent 15 across holdingsCount 8, inside the full-marks level.
- Portfolio volatility — 15 points of maxPoints 15. volatilityPercent 13, measured as a value-weighted average across holdingsWithHistory 8, inside the full-marks level.

What pulls it down: nothing. No factor lost any points, so there is no weak spot dragging the score lower.

What would move the score most: the assessment's suggestions list is empty, so the data contains no lever to point you toward. And because your score already equals maxScore 100, there is no headroom left in this scoring. Every holding was measurable — pricedHoldingsCount 8 out of holdingsCount 8, totalPortfolioValue 1000000 — so no factor was left unscored for lack of data. The assessment is not stale (stale false).

Claims cited:

- The readiness score is 100 on a scale of 100, with a maxScore of 100.
- The score falls in the Ready band.
- Emergency fund earned full points, with the fund covering 6+ months of expenses.
- Debt-to-income earned full points because no debt is carried against annual income of 3000000.
- Monthly surplus earned full points, with a surplus of 100000 on monthly income of 250000, a surplus rate of 40 percent.
- Portfolio concentration earned full points, with RELIANCE at 15 percent of the portfolio across 8 holdings.
- Portfolio volatility earned full points, with annualized volatility of 13 percent across 8 holdings with history.
- The suggestions list is empty and the score already equals the maximum, so the data offers no lever that would raise it further.
- All holdings were priced and valued, so no factor went unmeasured: 8 priced holdings out of 8, total portfolio value 1000000.
- The assessment is not stale.

### Output S18-B

Your investment readiness score is 100 out of 100 (Ready). Emergency fund: 6 months of expenses saved, worth 25 of 25 points. Debt-to-income: ₹0 of debt against ₹30,00,000 of annual income (ratio 0), worth 20 of 20 points. Monthly surplus: ₹1,00,000 a month (40% of income), worth 25 of 25 points. Portfolio concentration: your largest holding (RELIANCE) is 15% of the portfolio, worth 15 of 15 points. Portfolio volatility: 13% annualised across 8 holdings with enough history, worth 15 of 15 points.

Claims cited:

- Your investment readiness score is 100 out of 100 (Ready).
- Emergency fund: 6 months of expenses saved, worth 25 of 25 points.
- Debt-to-income: ₹0 of debt against ₹30,00,000 of annual income (ratio 0), worth 20 of 20 points.
- Monthly surplus: ₹1,00,000 a month (40% of income), worth 25 of 25 points.
- Portfolio concentration: your largest holding (RELIANCE) is 15% of the portfolio, worth 15 of 15 points.
- Portfolio volatility: 13% annualised across 8 holdings with enough history, worth 15 of 15 points.

## Partial price history (partial-history)

Score: 89 out of 100 (Ready); 85 of 100 points measurable.

Factors (the ground truth the explanation must match):
- Emergency fund: 18.8/25 points — Your emergency fund covers 3-6 months of expenses (6+ months is full marks).
- Debt-to-income: 18.7/20 points — Total debt of ₹1,00,000 is 0.06× your annual income of ₹15,60,000.
- Monthly surplus: 25/25 points — Monthly surplus of ₹45,000 is 34.6% of income (30% is full marks).
- Portfolio concentration: 13.1/15 points — Your largest holding, RELIANCE, is 30% of your portfolio (20% or less is full marks).
- Portfolio volatility: not measured — Not enough price history for your holdings yet, so volatility cannot be measured.

Top improvements (computed by code):
- Build your emergency fund to 6 months (currently 3-6 months) to gain 6.2 points.
- Reducing RELIANCE below 20% of your portfolio (currently 30%) would add 1.9 points.
- Clearing your ₹1,00,000 debt would add 1.3 points.

### Output S19-A

Your investment readiness score is 89 out of 100 (Ready). Only 85 of the 100 points could be measured from your data. Emergency fund: 4.5 months of expenses saved, worth 18.8 of 25 points. Debt-to-income: ₹1,00,000 of debt against ₹15,60,000 of annual income (ratio 0.06), worth 18.7 of 20 points. Monthly surplus: ₹45,000 a month (34.6% of income), worth 25 of 25 points. Portfolio concentration: your largest holding (RELIANCE) is 30% of the portfolio, worth 13.1 of 15 points. Portfolio volatility: not enough price history for your holdings yet, so volatility cannot be measured. Build your emergency fund to 6 months (currently 3-6 months) to gain 6.2 points. Reducing RELIANCE below 20% of your portfolio (currently 30%) would add 1.9 points. Clearing your ₹1,00,000 debt would add 1.3 points.

Claims cited:

- Your investment readiness score is 89 out of 100 (Ready). Only 85 of the 100 points could be measured from your data.
- Emergency fund: 4.5 months of expenses saved, worth 18.8 of 25 points.
- Debt-to-income: ₹1,00,000 of debt against ₹15,60,000 of annual income (ratio 0.06), worth 18.7 of 20 points.
- Monthly surplus: ₹45,000 a month (34.6% of income), worth 25 of 25 points.
- Portfolio concentration: your largest holding (RELIANCE) is 30% of the portfolio, worth 13.1 of 15 points.
- Portfolio volatility: not enough price history for your holdings yet, so volatility cannot be measured.
- Build your emergency fund to 6 months (currently 3-6 months) to gain 6.2 points.
- Reducing RELIANCE below 20% of your portfolio (currently 30%) would add 1.9 points.
- Clearing your ₹1,00,000 debt would add 1.3 points.

### Output S19-B

Your readiness score is 89 on a scale of 100, which places you in the "Ready" band (the assessment's maxScore field reads 85). It is built from five factors: four measured, one not measurable.

What pulls the score up:
- Monthly surplus is your strongest factor, earning the full points of 25 out of maxPoints 25. A monthly surplus of ₹45,000 on monthly income of ₹1,30,000 gives a surplusRatePercent of 34.6, above the full-marks level.
- Debt-to-income earns 18.7 out of maxPoints 20. Total debt of ₹1,00,000 against annual income of ₹15,60,000 is a debtToIncomeRatio of 0.06, so nearly all the available points are captured.
- Emergency fund earns 18.8 out of maxPoints 25. It covers 4.5 months of expenses, a solid middle-band level rather than the top band.
- Portfolio concentration earns 13.1 out of maxPoints 15. Your largest holding, RELIANCE, is 30% of the portfolio across 4 holdings, which is the main deduction among the measured factors.

What pulls it down or is missing:
- Portfolio volatility could not be measured at all: available is false because there is not enough price history, so it contributes points 0 out of maxPoints 15. I cannot say what it would have scored.

What would move the score most, using the assessment's own suggestions:
- Emergency fund: building it up to the suggested target would gain 6.2 points, the largest single lever available to you.
- Portfolio concentration: reducing RELIANCE below the suggested target weight would add 1.9 points.
- Debt-to-income: clearing the ₹1,00,000 debt would add 1.3 points.

This is only a summary of what the computed assessment says; I am not recommending any specific investment.

Claims cited:

- The readiness score is 89 on a scale of 100, in the "Ready" band, with maxScore recorded as 85.
- Monthly surplus earned full points of 25 out of maxPoints 25, with a surplus of ₹45,000 on monthly income of ₹1,30,000 and a surplusRatePercent of 34.6.
- Debt-to-income earned 18.7 out of maxPoints 20, with totalDebt of ₹1,00,000, annualIncome of ₹15,60,000 and a debtToIncomeRatio of 0.06.
- Emergency fund earned 18.8 out of maxPoints 25, with the fund covering 4.5 months of expenses.
- Portfolio concentration earned 13.1 out of maxPoints 15, with largest holding RELIANCE at a largestHoldingWeightPercent of 30 across holdingsCount of 4.
- Portfolio volatility could not be measured (available false) and contributes points 0 out of maxPoints 15.
- The emergency fund suggestion would gain 6.2 points, the largest gain among the suggestions.
- The portfolio concentration suggestion, reducing RELIANCE, would add 1.9 points.
- The debt-to-income suggestion of clearing the ₹1,00,000 debt would add 1.3 points.

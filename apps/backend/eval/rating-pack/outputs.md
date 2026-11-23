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

import { extractExpenseLocally, resolveExpenseCategory } from './ai.extract';

const TODAY = '2026-11-23';

describe('extractExpenseLocally', () => {
  it('extracts amount, category, date, and merchant from plain words', () => {
    expect(extractExpenseLocally('coffee 250', TODAY)).toEqual({
      amount: 250,
      category: 'Food & Dining',
      date: TODAY,
      merchant: 'coffee',
    });
  });

  it('reads Indian amounts with a Rs marker and commas', () => {
    expect(extractExpenseLocally('lunch Rs 1,250.50 yesterday', TODAY)).toEqual(
      {
        amount: 1250.5,
        category: 'Food & Dining',
        date: '2026-11-22',
        merchant: 'lunch',
      },
    );
  });

  it('takes the largest number when a quantity comes first', () => {
    expect(extractExpenseLocally('2 coffees 300', TODAY)).toEqual({
      amount: 300,
      category: 'Food & Dining',
      date: TODAY,
      merchant: 'coffees',
    });
  });

  it('does not mistake a date for the amount', () => {
    expect(extractExpenseLocally('coffee 250 on 2026-11-20', TODAY)).toEqual({
      amount: 250,
      category: 'Food & Dining',
      date: '2026-11-20',
      merchant: 'coffee',
    });
  });

  it('returns null when there is no amount to find', () => {
    expect(extractExpenseLocally('coffee', TODAY)).toBeNull();
    expect(extractExpenseLocally('how much did I spend?', TODAY)).toBeNull();
  });

  it('falls back to Others when no keyword matches', () => {
    expect(extractExpenseLocally('misc 99', TODAY)).toEqual({
      amount: 99,
      category: 'Others',
      date: TODAY,
      merchant: 'misc',
    });
  });

  it('matches keywords per category', () => {
    expect(
      extractExpenseLocally('cab to the airport 450', TODAY)?.category,
    ).toBe('Transport');
    expect(extractExpenseLocally('rent 15000', TODAY)?.category).toBe('Rent');
    expect(
      extractExpenseLocally('electricity bill 1200', TODAY)?.category,
    ).toBe('Bills & Utilities');
    expect(extractExpenseLocally('doctor visit 800', TODAY)?.category).toBe(
      'Health',
    );
    expect(extractExpenseLocally('movie tickets 600', TODAY)?.category).toBe(
      'Entertainment',
    );
  });

  it('strips a leading filler verb from the merchant name', () => {
    expect(extractExpenseLocally('paid rent 15000', TODAY)?.merchant).toBe(
      'rent',
    );
  });
});

describe('resolveExpenseCategory', () => {
  it('passes canonical labels through', () => {
    expect(resolveExpenseCategory('Groceries')).toBe('Groceries');
    expect(resolveExpenseCategory('rent')).toBe('Rent');
  });

  it('maps legacy labels to their canonical category', () => {
    expect(resolveExpenseCategory('Housing')).toBe('Rent');
    expect(resolveExpenseCategory('Other')).toBe('Others');
  });

  it('falls back to Others for null, empty, and unknown values', () => {
    expect(resolveExpenseCategory(null)).toBe('Others');
    expect(resolveExpenseCategory(undefined)).toBe('Others');
    expect(resolveExpenseCategory('')).toBe('Others');
    expect(resolveExpenseCategory('Made up')).toBe('Others');
  });

  it('matches keywords in a free-text category', () => {
    expect(resolveExpenseCategory('coffee shops')).toBe('Food & Dining');
  });
});

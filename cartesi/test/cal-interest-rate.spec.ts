import { describe, expect, test } from '@jest/globals';
import { calculateRequiredInterestRate, Transaction } from '../src/debt';
import Decimal from 'decimal.js';

describe('Debt Service Calculation', () => {
  test('calculates interest accurately for simple case', () => {
    const principal = 10000;
    const annualRate = 0.05; // 5%
    const termMonths = 12;
    
    // Create test transactions that would support a 5% interest rate
    const monthlyPayment = new Decimal(principal)
      .times(new Decimal(annualRate).dividedBy(12))
      .times(new Decimal(1).plus(new Decimal(annualRate).dividedBy(12)).pow(termMonths))
      .dividedBy(new Decimal(1).plus(new Decimal(annualRate).dividedBy(12)).pow(termMonths).minus(1));
    
    const requiredMonthlyNOI = monthlyPayment.times(1.25); // DSCR of 1.25
    
    const transactions: Transaction[] = Array(12).fill(null).map((_, i) => ({
      amount: requiredMonthlyNOI.toNumber(),
      date: new Date(2024, i, 1)
    }));

    const calculatedRate = calculateRequiredInterestRate(
      transactions,
      principal,
      termMonths
    );

    // Should be very close to 5%
    expect(Math.abs(calculatedRate - 5)).toBeLessThan(0.01);
  });

  test('handles edge cases correctly', () => {
    const transactions: Transaction[] = [
      { amount: 1000, date: new Date('2024-01-01') }
    ];

    // Empty transactions
    expect(calculateRequiredInterestRate([], 10000)).toBe(100); // Returns minInterestRate * 100

    // Negative NOI
    expect(calculateRequiredInterestRate(
      [{ amount: -1000, date: new Date('2024-01-01') }],
      10000
    )).toBe(100);

    // Invalid inputs should throw
    expect(() => calculateRequiredInterestRate(transactions, -1000))
      .toThrow('Invalid loan amount');
    expect(() => calculateRequiredInterestRate(transactions, 1000, -24))
      .toThrow('Invalid loan term');
    expect(() => calculateRequiredInterestRate(transactions, 1000, 24, -1.25))
      .toThrow('Invalid DSCR');
  });
});
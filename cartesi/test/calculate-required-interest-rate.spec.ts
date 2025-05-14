import { calculateRequiredInterestRate, Transaction } from '../src/debt';

describe('calculateRequiredInterestRate Integration Tests', () => {
  const loanAmount = 100000; // $100,000 loan

  describe('Normal Transaction Patterns', () => {
    it('should calculate rate with stable monthly transactions', () => {
      const transactions: Transaction[] = [
        { amount: 5000, date: new Date('2024-01-01') },
        { amount: 5200, date: new Date('2024-02-01') },
        { amount: 4800, date: new Date('2024-03-01') },
        { amount: 5100, date: new Date('2024-04-01') },
      ];

      const rate = calculateRequiredInterestRate(transactions, loanAmount);
      expect(rate).toBeGreaterThan(0);
      expect(rate).toBeLessThanOrEqual(1000); // 10% max
    });

    it('should handle increasing monthly transactions', () => {
      const transactions: Transaction[] = [
        { amount: 4000, date: new Date('2024-01-01') },
        { amount: 4500, date: new Date('2024-02-01') },
        { amount: 5000, date: new Date('2024-03-01') },
        { amount: 5500, date: new Date('2024-04-01') },
      ];

      const rate = calculateRequiredInterestRate(transactions, loanAmount);
      expect(rate).toBeGreaterThan(0);
      expect(rate).toBeLessThanOrEqual(1000);
    });
  });

  describe('Outlier Handling', () => {
    it('should handle and filter out obvious outliers', () => {
      const normalRate = calculateRequiredInterestRate([
        { amount: 5000, date: new Date('2024-01-01') },
        { amount: 5200, date: new Date('2024-02-01') },
        { amount: 5100, date: new Date('2024-03-01') },
      ], loanAmount);

      const rateWithOutliers = calculateRequiredInterestRate([
        { amount: 5000, date: new Date('2024-01-01') },
        { amount: 5200, date: new Date('2024-02-01') },
        { amount: 50000, date: new Date('2024-02-15') }, // outlier
        { amount: 5100, date: new Date('2024-03-01') },
      ], loanAmount);

      // Rates should be similar despite the outlier
      expect(Math.abs(normalRate - rateWithOutliers)).toBeLessThan(100); // within 1% difference
    });

    it('should handle multiple outliers across different months', () => {
      const transactions: Transaction[] = [
        { amount: 5000, date: new Date('2024-01-01') },
        { amount: 50000, date: new Date('2024-01-15') }, // outlier
        { amount: 5200, date: new Date('2024-02-01') },
        { amount: 100, date: new Date('2024-02-15') }, // outlier
        { amount: 5100, date: new Date('2024-03-01') },
      ];

      const rate = calculateRequiredInterestRate(transactions, loanAmount);
      expect(rate).toBeGreaterThan(0);
      expect(rate).toBeLessThanOrEqual(1000);
    });
  });

  describe('Time-Weighted Average Price (TWAP)', () => {
    it('should give more weight to recent transactions', () => {
      const lowerRecentTransactions: Transaction[] = [
        { amount: 6000, date: new Date('2024-01-01') },
        { amount: 6000, date: new Date('2024-02-01') },
        { amount: 4000, date: new Date('2024-03-01') }, // more recent, lower amount
        { amount: 4000, date: new Date('2024-04-01') },
      ];

      const higherRecentTransactions: Transaction[] = [
        { amount: 4000, date: new Date('2024-01-01') },
        { amount: 4000, date: new Date('2024-02-01') },
        { amount: 6000, date: new Date('2024-03-01') }, // more recent, higher amount
        { amount: 6000, date: new Date('2024-04-01') },
      ];

      const lowerRate = calculateRequiredInterestRate(lowerRecentTransactions, loanAmount);
      const higherRate = calculateRequiredInterestRate(higherRecentTransactions, loanAmount);

      expect(higherRate).toBeGreaterThan(lowerRate);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty transaction list', () => {
      const rate = calculateRequiredInterestRate([], loanAmount);
      expect(rate).toBe(100); // minimum rate (1%)
    });

    it('should handle single transaction', () => {
      const rate = calculateRequiredInterestRate([
        { amount: 5000, date: new Date('2024-01-01') },
      ], loanAmount);
      expect(rate).toBeGreaterThan(0);
      expect(rate).toBeLessThanOrEqual(1000);
    });

    it('should handle negative transactions', () => {
      const transactions: Transaction[] = [
        { amount: 5000, date: new Date('2024-01-01') },
        { amount: -1000, date: new Date('2024-02-01') },
        { amount: 5000, date: new Date('2024-03-01') },
      ];

      const rate = calculateRequiredInterestRate(transactions, loanAmount);
      expect(rate).toBeGreaterThan(0);
      expect(rate).toBeLessThanOrEqual(1000);
    });

    it('should handle all negative NOI', () => {
      const transactions: Transaction[] = [
        { amount: -1000, date: new Date('2024-01-01') },
        { amount: -1000, date: new Date('2024-02-01') },
      ];

      const rate = calculateRequiredInterestRate(transactions, loanAmount);
      expect(rate).toBe(100); // should return minimum rate
    });
  });

  describe('Parameter Variations', () => {
    const baseTransactions: Transaction[] = [
      { amount: 5000, date: new Date('2024-01-01') },
      { amount: 5200, date: new Date('2024-02-01') },
      { amount: 5100, date: new Date('2024-03-01') },
    ];

    it('should handle different loan amounts', () => {
      const smallLoanRate = calculateRequiredInterestRate(baseTransactions, 50000);
      const largeLoanRate = calculateRequiredInterestRate(baseTransactions, 200000);
      expect(largeLoanRate).toBeGreaterThan(smallLoanRate);
    });

    it('should handle different DSCR requirements', () => {
      const lowDscrRate = calculateRequiredInterestRate(
        baseTransactions, 
        loanAmount,
        24, // term
        1.1 // lower DSCR
      );

      const highDscrRate = calculateRequiredInterestRate(
        baseTransactions,
        loanAmount,
        24, // term
        1.5 // higher DSCR
      );

      expect(highDscrRate).toBeGreaterThan(lowDscrRate);
    });

    it('should handle different loan terms', () => {
      const shortTermRate = calculateRequiredInterestRate(
        baseTransactions,
        loanAmount,
        12 // 1 year
      );

      const longTermRate = calculateRequiredInterestRate(
        baseTransactions,
        loanAmount,
        60 // 5 years
      );

      expect(longTermRate).not.toBe(shortTermRate);
    });
  });

  describe('Manipulation Resistance', () => {
    it('should resist short-term manipulation attempts', () => {
      const normalTransactions: Transaction[] = [
        { amount: 5000, date: new Date('2024-01-01') },
        { amount: 5200, date: new Date('2024-02-01') },
        { amount: 5100, date: new Date('2024-03-01') },
      ];

      const manipulatedTransactions: Transaction[] = [
        { amount: 5000, date: new Date('2024-01-01') },
        { amount: 5200, date: new Date('2024-02-01') },
        { amount: 5100, date: new Date('2024-03-01') },
        { amount: 50000, date: new Date('2024-03-15') }, // manipulation attempt
        { amount: 50000, date: new Date('2024-03-16') }, // manipulation attempt
        { amount: 50000, date: new Date('2024-03-17') }, // manipulation attempt
      ];

      const normalRate = calculateRequiredInterestRate(normalTransactions, loanAmount);
      const manipulatedRate = calculateRequiredInterestRate(manipulatedTransactions, loanAmount);

      // Rates should not be significantly different
      expect(Math.abs(normalRate - manipulatedRate)).toBeLessThan(100);
    });
  });
});
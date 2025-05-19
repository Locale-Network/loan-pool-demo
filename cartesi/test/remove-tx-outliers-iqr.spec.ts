import { removeOutliersIQR, Transaction } from '../src/debt';

describe('removeOutliersIQR', () => {
  describe('Basic Outlier Detection', () => {
    it('should remove obvious outliers from a single month with sufficient data', () => {
      const transactions: Transaction[] = [
        { amount: 1000, date: new Date('2024-01-01') },
        { amount: 1200, date: new Date('2024-01-10') },
        { amount: 50000, date: new Date('2024-01-15') }, // outlier
        { amount: 1100, date: new Date('2024-01-20') },
        { amount: 900, date: new Date('2024-01-25') }
      ];

      const result = removeOutliersIQR(transactions);
      
      expect(Object.keys(result)).toHaveLength(1);
      expect(result['2024-01']).toHaveLength(4);
      expect(result['2024-01']).not.toContain(50000);
      expect(result['2024-01']).toEqual(expect.arrayContaining([1000, 1200, 1100, 900]));
    });

    // Key difference: IQR needs 4+ points
    it('should preserve all values when less than 4 transactions', () => {
      const transactions: Transaction[] = [
        { amount: 1000, date: new Date('2024-01-01') },
        { amount: 50000, date: new Date('2024-01-10') }, // would be outlier
        { amount: 1200, date: new Date('2024-01-15') }
      ];

      const result = removeOutliersIQR(transactions);
      expect(result['2024-01']).toHaveLength(3);
      expect(result['2024-01']).toContain(50000); // preserved despite being outlier
    });
  });

  describe('Multiple Months Handling', () => {
    it('should handle outliers independently for each month', () => {
      const transactions: Transaction[] = [
        // January - insufficient data
        { amount: 1000, date: new Date('2024-01-01') },
        { amount: 1200, date: new Date('2024-01-15') },
        
        // February - sufficient data with outlier
        { amount: 1100, date: new Date('2024-02-01') },
        { amount: 50000, date: new Date('2024-02-15') }, // outlier
        { amount: 1300, date: new Date('2024-02-28') },
        { amount: 1200, date: new Date('2024-02-10') },
        
        // March - sufficient data, no outliers
        { amount: 2000, date: new Date('2024-03-01') },
        { amount: 2100, date: new Date('2024-03-10') },
        { amount: 2200, date: new Date('2024-03-15') },
        { amount: 2300, date: new Date('2024-03-20') }
      ];

      const result = removeOutliersIQR(transactions);
      
      expect(Object.keys(result)).toHaveLength(3);
      expect(result['2024-01']).toHaveLength(2); // preserved due to insufficient data
      expect(result['2024-02']).not.toContain(50000); // removed outlier
      expect(result['2024-03']).toHaveLength(4); // preserved all valid data
    });
  });

  // Most edge cases remain similar but with adjusted expectations
  describe('Edge Cases', () => {
    it('should handle empty transaction list', () => {
      const result = removeOutliersIQR([]);
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should preserve single transaction in a month', () => {
      const transactions: Transaction[] = [
        { amount: 1000, date: new Date('2024-01-01') }
      ];

      const result = removeOutliersIQR(transactions);
      expect(result['2024-01']).toHaveLength(1);
    });

    it('should preserve all identical amounts regardless of count', () => {
      const transactions: Transaction[] = [
        { amount: 1000, date: new Date('2024-01-01') },
        { amount: 1000, date: new Date('2024-01-10') },
        { amount: 1000, date: new Date('2024-01-15') },
        { amount: 1000, date: new Date('2024-01-20') }
      ];

      const result = removeOutliersIQR(transactions);
      expect(result['2024-01']).toHaveLength(4);
    });
  });

  describe('Statistical Properties', () => {
    it('should identify outliers using 1.5 * IQR rule', () => {
      const transactions: Transaction[] = [
        { amount: 100, date: new Date('2024-01-01') },
        { amount: 200, date: new Date('2024-01-05') },
        { amount: 300, date: new Date('2024-01-10') },
        { amount: 400, date: new Date('2024-01-15') },
        { amount: 10000, date: new Date('2024-01-20') } // outlier
      ];

      const result = removeOutliersIQR(transactions);
      expect(result['2024-01']).not.toContain(10000);
      expect(result['2024-01']).toHaveLength(4);
    });
  });
});
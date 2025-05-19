import { removeOutliersMAD, Transaction } from '../src/debt';

describe('removeOutliersMAD', () => {
  describe('Basic Outlier Detection', () => {
    it('should remove obvious outliers from a single month', () => {
      const transactions: Transaction[] = [
        { amount: 1000, date: new Date('2024-01-01') },
        { amount: 1200, date: new Date('2024-01-10') },
        { amount: 50000, date: new Date('2024-01-15') }, // outlier
        { amount: 1100, date: new Date('2024-01-20') },
        { amount: 900, date: new Date('2024-01-25') }
      ];

      const result = removeOutliersMAD(transactions);
      
      expect(Object.keys(result)).toHaveLength(1);
      expect(result['2024-01']).toHaveLength(4);
      expect(result['2024-01']).not.toContain(50000);
      expect(result['2024-01']).toEqual(expect.arrayContaining([1000, 1200, 1100, 900]));
    });

    it('should handle both high and low outliers', () => {
      const transactions: Transaction[] = [
        { amount: 1000, date: new Date('2024-01-01') },
        { amount: 50000, date: new Date('2024-01-10') }, // high outlier
        { amount: 1200, date: new Date('2024-01-15') },
        { amount: 10, date: new Date('2024-01-20') },    // low outlier
        { amount: 1100, date: new Date('2024-01-25') }
      ];

      const result = removeOutliersMAD(transactions);
      
      expect(result['2024-01']).toHaveLength(3);
      expect(result['2024-01']).not.toContain(50000);
      expect(result['2024-01']).not.toContain(10);
    });
  });

  describe('Multiple Months Handling', () => {
    it('should handle outliers independently for each month', () => {
      const transactions: Transaction[] = [
        // January - normal values
        { amount: 1000, date: new Date('2024-01-01') },
        { amount: 1200, date: new Date('2024-01-15') },
        
        // February - includes outlier
        { amount: 1100, date: new Date('2024-02-01') },
        { amount: 50000, date: new Date('2024-02-15') }, // outlier
        { amount: 1300, date: new Date('2024-02-28') },
        
        // March - normal but higher values
        { amount: 2000, date: new Date('2024-03-01') },
        { amount: 2200, date: new Date('2024-03-15') }
      ];

      const result = removeOutliersMAD(transactions);
      
      expect(Object.keys(result)).toHaveLength(3);
      expect(result['2024-01']).toHaveLength(2);
      expect(result['2024-02']).toHaveLength(2);
      expect(result['2024-02']).not.toContain(50000);
      expect(result['2024-03']).toHaveLength(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty transaction list', () => {
        const result = removeOutliersMAD([]);
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should handle single transaction in a month', () => {
      const transactions: Transaction[] = [
        { amount: 1000, date: new Date('2024-01-01') }
      ];

      const result = removeOutliersMAD(transactions);
      
      expect(Object.keys(result)).toHaveLength(1);
      expect(result['2024-01']).toHaveLength(1);
      expect(result['2024-01']).toContain(1000);
    });

    it('should handle negative amounts', () => {
      const transactions: Transaction[] = [
        { amount: 1000, date: new Date('2024-01-01') },
        { amount: -50000, date: new Date('2024-01-10') }, // negative outlier
        { amount: 1200, date: new Date('2024-01-15') },
        { amount: 1100, date: new Date('2024-01-20') }
      ];

      const result = removeOutliersMAD(transactions);
      
      expect(result['2024-01']).not.toContain(-50000);
      expect(result['2024-01']).toHaveLength(3);
    });

    it('should handle all identical amounts', () => {
      const transactions: Transaction[] = [
        { amount: 1000, date: new Date('2024-01-01') },
        { amount: 1000, date: new Date('2024-01-10') },
        { amount: 1000, date: new Date('2024-01-15') }
      ];

      const result = removeOutliersMAD(transactions);
      
      expect(result['2024-01']).toHaveLength(3);
      expect(result['2024-01']).toEqual([1000, 1000, 1000]);
    });
  });

  describe('Statistical Properties', () => {
    it('should keep values within 2 standard deviations', () => {
      const transactions: Transaction[] = [
        { amount: 1000, date: new Date('2024-01-01') },
        { amount: 1100, date: new Date('2024-01-05') },
        { amount: 1200, date: new Date('2024-01-10') },
        { amount: 1300, date: new Date('2024-01-15') },
        { amount: 5000, date: new Date('2024-01-20') }  // > 2 std devs
      ];

      const result = removeOutliersMAD(transactions);
      
      expect(result['2024-01']).toHaveLength(4);
      expect(result['2024-01']).not.toContain(5000);
    });

    it('should handle gradual increases correctly', () => {
      const transactions: Transaction[] = [
        { amount: 1000, date: new Date('2024-01-01') },
        { amount: 1200, date: new Date('2024-01-10') },
        { amount: 1400, date: new Date('2024-01-20') },
        { amount: 1600, date: new Date('2024-01-30') }
      ];

      const result = removeOutliersMAD(transactions);
      
      // Gradual increases should not be considered outliers
      expect(result['2024-01']).toHaveLength(4);
    });
  });

  describe('Cross-Year Handling', () => {
    it('should handle transactions across different years', () => {
      const transactions: Transaction[] = [
        { amount: 1000, date: new Date('2023-12-31') },
        { amount: 1200, date: new Date('2024-01-01') },
        { amount: 50000, date: new Date('2024-01-02') } // outlier
      ];

      const result = removeOutliersMAD(transactions);
      
      expect(Object.keys(result)).toHaveLength(2); // Two different months
      expect(result['2023-12']).toBeDefined();
      expect(result['2024-01']).toBeDefined();
      expect(result['2024-01']).not.toContain(50000);
    });
  });
});
export interface Transaction {
  amount: number;
  date: Date;
}

/**
 * Groups transaction amounts by month.
 * @key string - Month in "YYYY-MM" format (e.g., "2024-01")
 * @value number[] - Array of transaction amounts for that month
 * @example
 * {
 *   "2024-01": [1000, 2000, 3000],
 *   "2024-02": [1500, 2500],
 *   "2024-03": [3000, 4000, 5000]
 * }
 */
type TransactionsByMonth = Record<string, number[]>;

const groupTransactionsByMonth = (transactions: Transaction[]): TransactionsByMonth => {
  return transactions.reduce((acc, tx) => {
    const date = new Date(tx.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    
    acc[monthKey].push(tx.amount);
    return acc;
  }, {} as Record<string, number[]>);
};

const calculateStandardDeviation = (values: number[]): number => {
  const mean = calculateMean(values);
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length);
}

const calculateMean = (values: number[]): number => {
  return values.reduce((sum, val) => sum + val, 0) / values.length;
} 

function calculateMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1]! + sorted[middle]!) / 2;
  }
  return sorted[middle]!;
}

export const removeOutliersMAD = (transactions: Transaction[]): TransactionsByMonth => {
  // Group transactions by month
  const transactionsByMonth = groupTransactionsByMonth(transactions);

  const cleanedTransactionsByMonth = Object.entries(transactionsByMonth)
    .reduce((acc, [month, amounts]) => {

       if (amounts.length <= 1) {
        acc[month] = amounts;
        return acc;
      }

      // Use median absolute deviation
          const median = calculateMedian(amounts);
        const deviations = amounts.map(x => Math.abs(x - median));
      const mad = calculateMedian(deviations);

       // If MAD is 0 (all values identical), keep all values
    if (mad === 0) {
      acc[month] = amounts;
      return acc;
    }

      // Use modified z-score with MAD    
         const validAmounts = amounts.filter(amount => {
        const modifiedZScore = 0.6745 * Math.abs(amount - median) / mad;
        return modifiedZScore <= 3.5; // Common threshold for modified z-score
      });
      
      acc[month] = validAmounts;
      return acc;
    }, {} as Record<string, number[]>);

  return cleanedTransactionsByMonth;
};

export const removeOutliersIQR = (transactions: Transaction[]): TransactionsByMonth => {
  const transactionsByMonth = groupTransactionsByMonth(transactions);

  return Object.entries(transactionsByMonth).reduce((acc, [month, amounts]) => {
    // Keep all values if less than 4 transactions
    if (amounts.length < 4) {
      acc[month] = amounts;
      return acc;
    }

    const sorted = [...amounts].sort((a, b) => a - b);
    const q1 = sorted[Math.floor((sorted.length - 1) * 0.25)]!;
    const q3 = sorted[Math.floor((sorted.length - 1) * 0.75)]!;
    const iqr = q3 - q1;
    
    const lowerBound = q1 - (1.5 * iqr);
    const upperBound = q3 + (1.5 * iqr);

    acc[month] = amounts.filter(amount => 
      amount >= lowerBound && amount <= upperBound
    );
    
    return acc;
  }, {} as TransactionsByMonth);
};

export function calculateTWAP(noiByMonth: Record<string, number>): number {
  const monthsSorted = Object.keys(noiByMonth).sort(); // oldest to newest
  const decayFactor = 0.9; // 10% less weight per month
  let weightedSum = 0;
  let totalWeight = 0;

  for (let i = 0; i < monthsSorted.length; i++) {
    const month = monthsSorted[i];
    

    if (!month) {
      continue;
    }

    const noi = noiByMonth[month]!;

    if (typeof noi !== 'number' || isNaN(noi)) {
      continue;
    }

    const monthsAgo = monthsSorted.length - 1 - i; // 0 = most recent
    const weight = Math.pow(decayFactor, monthsAgo);
    weightedSum += noi * weight;
    totalWeight += weight;
  }

  return totalWeight === 0 ? 0 : weightedSum / totalWeight;
}

export function calculateRequiredInterestRate(
  transactions: Transaction[],
  loanAmount: number,
  termInMonths: number = 24,
  dscr: number = 1.25,
  minInterestRate: number = 1,
  maxInterestRate: number = 10
): number {
  // Group transactions by month and calculate NOI for each month
  const noiByMonth = transactions.reduce(
    (acc, tx) => {
      const date = new Date(tx.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      acc[monthKey] = (acc[monthKey] || 0) + tx.amount;
      return acc;
    },
    {} as Record<string, number>
  );

  // Calculate average monthly NOI instead of using most recent month
  const months = Object.keys(noiByMonth);
  if (months.length === 0) {
    return minInterestRate * 100;
  }
  const monthlyNOI = Object.values(noiByMonth).reduce((sum, noi) => sum + noi, 0) / months.length;

  if (!monthlyNOI || monthlyNOI < 0) {
    return minInterestRate * 100;
  }

  // Binary search to find the minimum interest rate that satisfies DSCR
  let low = minInterestRate;
  let high = maxInterestRate;
  const tolerance = 0.0001;

  while (high - low > tolerance) {
    const mid = (low + high) / 2;
    const rate = mid / 100;

    const monthlyRate = rate / 12;
    const numberOfPayments = termInMonths;
    const monthlyPayment =
      (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments))) /
      (Math.pow(1 + monthlyRate, numberOfPayments) - 1);

    // Calculate total payments over the loan term
    const totalPayments = monthlyPayment * termInMonths;
    const totalNOI = monthlyNOI * termInMonths;

    // Calculate DSCR over the entire loan term
    const actualDSCR = totalNOI / totalPayments;

    // If DSCR requirement is met, try a lower rate
    if (actualDSCR < dscr) {
      high = mid;
    } else {
      // If DSCR requirement is not met, need a higher rate
      low = mid;
    }
  }

  return high * 100; // Return the lowest viable interest rate
}
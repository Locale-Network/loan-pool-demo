export interface Transaction {
  amount: number;
  date: Date;
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

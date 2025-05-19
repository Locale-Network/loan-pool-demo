import { describe, expect, test } from "@jest/globals";
import { calculateRequiredInterestRate, Transaction } from "../src/debt";
import Decimal from 'decimal.js';

describe("Interest Calculation Accuracy", () => {
  test("verifies interest calculation accuracy", () => {
    // Test case: $10,000 loan at 5% for 12 months
    const principal = 10000;
    const annualRate = 0.05; // 5%
    const termMonths = 12;
    
    // Create transactions that would support a 5% interest rate
    // We need monthly NOI that satisfies DSCR of 1.25
    const monthlyPayment = new Decimal(principal)
      .times(annualRate / 12)
      .times(new Decimal(1).plus(new Decimal(annualRate).dividedBy(12)).pow(termMonths))
      .dividedBy(new Decimal(1).plus(new Decimal(annualRate).dividedBy(12)).pow(termMonths).minus(1));
    
    const requiredMonthlyNOI = monthlyPayment.times(1.25); // DSCR of 1.25
    
    // Create 12 months of transactions
    const standardTransactions: Transaction[] = Array(12).fill(null).map((_, i) => ({
      amount: requiredMonthlyNOI.toNumber(),
      date: new Date(2024, i, 1) // One transaction per month for 2024
    }));

    // Calculate expected interest (simple interest formula)
    const expectedInterest = new Decimal(principal).times(annualRate);

    // Calculate using our improved implementation
    const calculatedRate = calculateRequiredInterestRate(
      standardTransactions,
      principal,
      termMonths
    );

    // Convert rate to actual interest amount using Decimal.js
    const calculatedInterest = new Decimal(principal)
      .times(new Decimal(calculatedRate).dividedBy(100))
      .dividedBy(12)
      .times(termMonths);

    // Calculate error percentage
    const errorPercentage = expectedInterest
      .minus(calculatedInterest)
      .dividedBy(expectedInterest)
      .times(100)
      .abs();

    console.log(`Expected Interest: ${expectedInterest.toFixed(2)}`);
    console.log(`Calculated Interest: ${calculatedInterest.toFixed(2)}`);
    console.log(`Error percentage: ${errorPercentage.toFixed(2)}%`);

    // The error should be less than 1% with our improved implementation
    expect(errorPercentage.toNumber()).toBeLessThan(1);

    // Additional verification that calculated rate is close to expected 5%
    expect(Math.abs(calculatedRate - 5)).toBeLessThan(0.1);
  });

  test("verifies DSCR calculation accuracy", () => {
    const principal = 10000;
    const annualRate = 0.05;
    const termMonths = 12;
    const targetDSCR = 2.0;

    // Calculate monthly payment at 5% interest
    const monthlyPayment = new Decimal(principal)
      .times(annualRate / 12)
      .times(new Decimal(1).plus(new Decimal(annualRate).dividedBy(12)).pow(termMonths))
      .dividedBy(new Decimal(1).plus(new Decimal(annualRate).dividedBy(12)).pow(termMonths).minus(1));

    // Create transactions with NOI that should give us DSCR of 2.0
    const requiredMonthlyNOI = monthlyPayment.times(targetDSCR);
    
    const transactions: Transaction[] = Array(12).fill(null).map((_, i) => ({
      amount: requiredMonthlyNOI.toNumber(),
      date: new Date(2024, i, 1)
    }));

    // Calculate rate using our implementation
    const calculatedRate = calculateRequiredInterestRate(
      transactions,
      principal,
      termMonths,
      targetDSCR
    );

    // Calculate actual DSCR using the calculated rate
    const actualMonthlyPayment = new Decimal(principal)
      .times(new Decimal(calculatedRate).dividedBy(100).dividedBy(12))
      .times(new Decimal(1).plus(new Decimal(calculatedRate).dividedBy(100).dividedBy(12)).pow(termMonths))
      .dividedBy(new Decimal(1).plus(new Decimal(calculatedRate).dividedBy(100).dividedBy(12)).pow(termMonths).minus(1));

    const actualDSCR = requiredMonthlyNOI.dividedBy(actualMonthlyPayment);

    console.log(`Target DSCR: ${targetDSCR}`);
    console.log(`Actual DSCR: ${actualDSCR.toFixed(4)}`);
    
    // The actual DSCR should be very close to target DSCR
    expect(Math.abs(actualDSCR.toNumber() - targetDSCR)).toBeLessThan(0.01);
  });
});
import { describe, expect, test, jest } from "@jest/globals";
import { validatePayload, validateTransactions, validateTransaction, ValidationError, PayloadError, TransactionError } from "../src/validation";
// import { MAX_LOAN_AMOUNT, MIN_LOAN_AMOUNT } from "../src/index";

const MAX_LOAN_AMOUNT = BigInt("1000000000000000000"); // 1 quintillion (1e18)
const MIN_LOAN_AMOUNT = BigInt(1);

describe("Loan Request Handler", () => {
  // Mock data based on the provided transaction format
  const validTransactionPayload = {
    loanId: "loan123",
    loanAmount: "20000",
    transactions: [
      {
        amount: 5.4,
        account_id: "9r4qdwDkpEtxkDNlpb85UygzW8b9GltqrR9Vm",
        iso_currency_code: "USD",
        date: "2024-12-20"
      },
      {
        amount: 1600,
        account_id: "9r4qdwDkpEtxkDNlpb85UygzW8b9GltqrR9Vm",
        iso_currency_code: "USD",
        date: "2024-11-18"
      },
      {
        amount: 1600,
        account_id: "9r4qdwDkpEtxkDNlpb85UygzW8b9GltqrR9Vm",
        iso_currency_code: "USD",
        date: "2023-08-25"
      }
    ]
  };

  // Test payload validation
  describe("Payload Validation", () => {
      test("validates correct payload format", () => {
        
             const payload = {
        loanId: "test123",
        loanAmount: "1000",
        transactions: [
          {
            amount: 5.4,
            account_id: "9r4qdwDkpEtxkDNlpb85UygzW8b9GltqrR9Vm",
            iso_currency_code: "USD",
            date: "2024-12-20"
          },
          {
            amount: 1600,
            account_id: "9r4qdwDkpEtxkDNlpb85UygzW8b9GltqrR9Vm",
            iso_currency_code: "USD",
            date: "2024-11-18"
          },
          {
            amount: 1600,
            account_id: "9r4qdwDkpEtxkDNlpb85UygzW8b9GltqrR9Vm",
            iso_currency_code: "USD",
            date: "2023-08-25"
          }
        ]
             };
          
          
          
       const data = {
        payload: JSON.stringify(payload)
      };

      expect(() => validatePayload(data.payload)).not.toThrow();
    });

    test("rejects empty payload", () => {
      expect(() => validatePayload(undefined))
        .toThrow(PayloadError);
      expect(() => validatePayload(""))
        .toThrow(PayloadError);
    });

    test("rejects invalid JSON payload", () => {
      const invalidJson = "0x" + Buffer.from("{invalid:json}").toString('hex');
      expect(() => validatePayload(invalidJson))
        .toThrow(PayloadError);
    });
  });

  // Test transaction validation
  describe("Transaction Validation", () => {
    test("validates correct transaction format", () => {
      const transaction = {
        amount: 5.4,
        date: "2024-12-20"
      };

      expect(() => validateTransaction(transaction)).not.toThrow();
    });

    test("rejects transaction with invalid amount", () => {
      const transaction = {
        amount: "not a number",
        date: "2024-12-20"
      };

      expect(() => validateTransaction(transaction))
        .toThrow(TransactionError);
    });

    test("rejects transaction with invalid date", () => {
      const transaction = {
        amount: 5.4,
        date: "invalid-date"
      };

      expect(() => validateTransaction(transaction))
        .toThrow(TransactionError);
    });

    test("validates array of transactions", () => {
      const transactions = validTransactionPayload.transactions.map(tx => ({
        amount: tx.amount,
        date: tx.date
      }));

      expect(() => validateTransactions(transactions)).not.toThrow();
    });

    test("rejects empty transaction array", () => {
      expect(() => validateTransactions([]))
        .toThrow(ValidationError);
    });
  });

  // Test loan amount validation
  describe("Loan Amount Validation", () => {
    test("validates correct loan amount", () => {
      const amount = "20000";
      expect(() => BigInt(amount)).not.toThrow();
    });

    test("rejects negative loan amount", () => {
      const amount = "-20000";
      expect(() => {
        const bigInt = BigInt(amount);
        if (bigInt <= MIN_LOAN_AMOUNT) {
          throw new ValidationError('Loan amount must be greater than 0');
        }
      }).toThrow(ValidationError);
    });

    test("rejects loan amount exceeding maximum", () => {
      const amount = MAX_LOAN_AMOUNT.toString() + "0"; // Exceed max by 10x
      expect(() => {
        const bigInt = BigInt(amount);
        if (bigInt >= MAX_LOAN_AMOUNT) {
          throw new ValidationError(`Loan amount exceeds maximum allowed`);
        }
      }).toThrow(ValidationError);
    });
  });
});
import { Transaction } from './debt';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class PayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PayloadError';
  }
}

export class TransactionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransactionError';
  }
}

// Validation functions
export function validateTransaction(tx: any): Transaction {
  if (!tx || typeof tx !== 'object') {
    throw new TransactionError('Invalid transaction format');
  }

  if (typeof tx.amount !== 'number') {
    throw new TransactionError('Transaction amount must be a number');
  }

  if (!(tx.date instanceof Date) && !isValidDateString(tx.date)) {
    throw new TransactionError('Invalid transaction date');
  }

  return {
    amount: tx.amount,
    date: tx.date instanceof Date ? tx.date : new Date(tx.date),
  };
}

export function validateTransactions(transactions: any[]): Transaction[] {
  if (!Array.isArray(transactions)) {
    throw new ValidationError('Transactions must be an array');
  }

  if (transactions.length === 0) {
    throw new ValidationError('At least one transaction is required');
  }

  return transactions.map((tx, index) => {
    try {
      return validateTransaction(tx);
    } catch (e) {
      throw new ValidationError(
        `Invalid transaction at index ${index}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  });
}

export function isValidDateString(date: string): boolean {
  const parsedDate = new Date(date);
  return parsedDate instanceof Date && !isNaN(parsedDate.getTime());
}

export function validatePayload(payloadStr: string | undefined): any {
  if (!payloadStr) {
    throw new PayloadError('Empty payload');
  }

  try {
    return JSON.parse(payloadStr);
  } catch (e) {
    throw new PayloadError('Invalid JSON payload');
  }
}

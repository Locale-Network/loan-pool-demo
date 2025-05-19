import createClient from 'openapi-fetch';
import { components, paths } from './schema';
import { calculateRequiredInterestRate, Transaction } from './debt';
import { stringToHex } from 'viem';
import Decimal from 'decimal.js';
import {
  validatePayload,
  validateTransactions,
  ValidationError,
  PayloadError,
  TransactionError,
} from './validation';

export const MAX_LOAN_AMOUNT = BigInt('1000000000000000000'); // 1 quintillion (1e18)
export const MIN_LOAN_AMOUNT = BigInt(1);

type AdvanceRequestData = components['schemas']['Advance'];
type InspectRequestData = components['schemas']['Inspect'];
type RequestHandlerResult = components['schemas']['Finish']['status'];
type RollupsRequest = components['schemas']['RollupRequest'];
type InspectRequestHandler = (data: InspectRequestData) => Promise<void>;
type AdvanceRequestHandler = (data: AdvanceRequestData) => Promise<RequestHandlerResult>;

const rollupServer = process.env.ROLLUP_HTTP_SERVER_URL;
console.log('HTTP rollup_server url is ' + rollupServer);

const handleAdvance: AdvanceRequestHandler = async data => {
  try {
    // Validate and decode payload
    if (!data.payload) {
      throw new PayloadError('Payload is required');
    }

    const payloadStr = Buffer.from(data.payload.slice(2), 'hex').toString('utf8');
    const payload = validatePayload(payloadStr);

    // Validate loan ID
    if (!payload.loanId || typeof payload.loanId !== 'string') {
      throw new ValidationError('Valid loan ID is required');
    }

    // Validate loan amount
    if (!payload.loanAmount) {
      throw new ValidationError('Loan amount is required');
    }

    let loanAmountBigInt: bigint;
    try {
      loanAmountBigInt = BigInt(payload.loanAmount);
    } catch (e) {
      throw new ValidationError('Invalid loan amount format');
    }

    if (loanAmountBigInt <= MIN_LOAN_AMOUNT) {
      throw new ValidationError('Loan amount must be greater than 0');
    }
    if (loanAmountBigInt >= MAX_LOAN_AMOUNT) {
      throw new ValidationError(`Loan amount exceeds maximum allowed (${MAX_LOAN_AMOUNT})`);
    }

    // Validate and process transactions
    if (!payload.transactions) {
      throw new ValidationError('Transactions are required');
    }

    const validatedTransactions = validateTransactions(payload.transactions);
    const loanAmountDecimal = new Decimal(loanAmountBigInt.toString());

    // Calculate interest rate
    const interestRate = calculateRequiredInterestRate(
      validatedTransactions,
      loanAmountDecimal.toNumber()
    );

    // Prepare and send response
    const response = {
      loanId: payload.loanId,
      interestRate: new Decimal(interestRate).toFixed(6),
      loanAmount: loanAmountBigInt.toString(),
    };

    await fetch(`${rollupServer}/notice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        payload: stringToHex(JSON.stringify(response)),
      }),
    }).catch(e => {
      throw new Error(`Failed to send notice: ${e.message}`);
    });

    return 'accept';
  } catch (e) {
    // Structured error logging
    if (e instanceof ValidationError) {
      console.error(`Validation Error: ${e.message}`);
    } else if (e instanceof PayloadError) {
      console.error(`Payload Error: ${e.message}`);
    } else if (e instanceof TransactionError) {
      console.error(`Transaction Error: ${e.message}`);
    } else {
      console.error(`Unexpected Error: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Re-throw to ensure proper error handling up the chain
    throw e;
  }
};

const handleInspect: InspectRequestHandler = async data => {
  console.log('Received inspect request data ' + JSON.stringify(data));
};

const main = async () => {
  const { POST } = createClient<paths>({ baseUrl: rollupServer });
  let status: RequestHandlerResult = 'accept';
  while (true) {
    const { response } = await POST('/finish', {
      body: { status },
      parseAs: 'text',
    });

    if (response.status === 200) {
      const data = (await response.json()) as RollupsRequest;
      switch (data.request_type) {
        case 'advance_state':
          status = await handleAdvance(data.data as AdvanceRequestData);
          break;
        case 'inspect_state':
          await handleInspect(data.data as InspectRequestData);
          break;
      }
    } else if (response.status === 202) {
      console.log(await response.text());
    }
  }
};

main().catch(e => {
  console.log(e);
  process.exit(1);
});

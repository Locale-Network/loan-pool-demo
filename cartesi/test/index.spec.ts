import { describe, expect, test } from "@jest/globals";
import { calculateRequiredInterestRate, Transaction } from "../src/debt";

const rawProofContext =
  '{"contextAddress":"0x6883491Ba535c16D39160C0CD60569a18afdB1a5","contextMessage":"debt service calculation for 0x6883491Ba535c16D39160C0CD60569a18afdB1a5 at 2024-12-24T15:47:25.888Z for loan application cm52n3dtu0000ju03msta02k1","extractedParameters":{"URL_PARAMS_1":"cm52n3dtu0000ju03msta02k1","transactions":"[{\\"amount\\":5.4,\\"account_id\\":\\"9r4qdwDkpEtxkDNlpb85UygzW8b9GltqrR9Vm\\",\\"iso_currency_code\\":\\"USD\\",\\"date\\":\\"2024-12-20\\"},{\\"amount\\":1600,\\"account_id\\":\\"9r4qdwDkpEtxkDNlpb85UygzW8b9GltqrR9Vm\\",\\"iso_currency_code\\":\\"USD\\",\\"date\\":\\"2024-11-18\\"},{\\"amount\\":1600,\\"account_id\\":\\"9r4qdwDkpEtxkDNlpb85UygzW8b9GltqrR9Vm\\",\\"iso_currency_code\\":\\"USD\\",\\"date\\":\\"2023-08-25\\"}]"},"providerHash":"0x1df172a1d20272d4c19afa10746886026c281a1ae1b2b11f5dfef68ef468bf06"}';

describe("Debt Service Calculation", () => {
  test("should calculate the correct interest rate", () => {
    const proofContext = JSON.parse(rawProofContext);

    const transactions = JSON.parse(
      proofContext.extractedParameters.transactions
    ) as Transaction[];

    const loanAmount = 20000;

    const interestRate = calculateRequiredInterestRate(
      transactions,
      loanAmount
    );

    console.log(interestRate);

    // The rate should be around 2.46%
    expect(interestRate).toBeCloseTo(2.458984, 6);
    
    // Additional assertions to verify the rate makes sense
    expect(interestRate).toBeGreaterThan(0);
    expect(interestRate).toBeLessThan(10);
  });
});

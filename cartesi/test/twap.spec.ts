import { calculateTWAP } from '../src/debt';

describe('calculateTWAP', () => {
  it('calculates correct TWAP with default decay', () => {
    const noi: Record<string, number> = {
      '2024-01': 1000,
      '2024-02': 2000,
      '2024-03': 3000
    };
    // Weights: Jan = 0.81, Feb = 0.9, Mar = 1.0
    const expected =
      (1000 * 0.81 + 2000 * 0.9 + 3000 * 1.0) / (0.81 + 0.9 + 1.0);

    const result = calculateTWAP(noi);
    expect(result).toBeCloseTo(expected, 5);
  });

  it('returns 0 for empty input', () => {
    const result = calculateTWAP({});
    expect(result).toBe(0);
  });

  it('skips undefined values', () => {
    const noi: Record<string, number> = {
      '2024-01': 1000,
      '2024-02': undefined as unknown as number, // simulate corruption
      '2024-03': 3000
    };
    const expected = (1000 * 0.9 + 3000 * 1.0) / (0.9 + 1.0);
    const result = calculateTWAP(noi);
    expect(result).toBeCloseTo(expected, 5);
  });

  it('correctly handles a single month', () => {
    const noi = { '2024-01': 5000 };
    const result = calculateTWAP(noi);
    expect(result).toBe(5000);
  });

  it('is stable regardless of key order', () => {
    const original = {
      '2024-01': 1000,
      '2024-02': 2000,
      '2024-03': 3000
    };
    const shuffled = {
      '2024-03': 3000,
      '2024-01': 1000,
      '2024-02': 2000
    };
    const resultOriginal = calculateTWAP(original);
    const resultShuffled = calculateTWAP(shuffled);
    expect(resultOriginal).toBeCloseTo(resultShuffled, 5);
  });
});

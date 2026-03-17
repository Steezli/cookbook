export class ScanLimitError extends Error {
  name = 'ScanLimitError';

  constructor(public readonly currentCount: number) {
    super(`Scan limit reached: ${currentCount} scans used this month`);
  }
}

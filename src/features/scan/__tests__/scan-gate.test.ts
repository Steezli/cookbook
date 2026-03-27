import { ScanLimitError } from '../errors';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
    },
    from: jest.fn().mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'job-1',
              user_id: 'user-1',
              status: 'pending',
              created_at: new Date().toISOString(),
            },
            error: null,
          }),
        }),
      }),
    }),
  },
}));

// Mock scan-count module
const mockIncrementScanCount = jest.fn();
jest.mock('@/features/subscriptions/scan-count', () => ({
  incrementScanCount: (...args: unknown[]) => mockIncrementScanCount(...args),
}));

import { createMultiPhotoScanJob } from '../scan-service';

describe('scan gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('free user, count 1: resolves with scan job', async () => {
    mockIncrementScanCount.mockResolvedValue(1);

    const result = await createMultiPhotoScanJob({ userId: 'user-1', photoUris: ['uri1'] });

    expect(result).toBeDefined();
    expect(result.id).toBe('job-1');
    expect(mockIncrementScanCount).toHaveBeenCalledWith('user-1');
  });

  it('free user, count 2: resolves with scan job', async () => {
    mockIncrementScanCount.mockResolvedValue(2);

    const result = await createMultiPhotoScanJob({ userId: 'user-1', photoUris: ['uri1'] });

    expect(result).toBeDefined();
    expect(result.id).toBe('job-1');
    expect(mockIncrementScanCount).toHaveBeenCalledWith('user-1');
  });

  it('free user, count 3 (limit): throws ScanLimitError', async () => {
    mockIncrementScanCount.mockRejectedValue(new ScanLimitError(4));

    await expect(
      createMultiPhotoScanJob({ userId: 'user-1', photoUris: ['uri1'] })
    ).rejects.toThrow(ScanLimitError);

    expect(mockIncrementScanCount).toHaveBeenCalledWith('user-1');
  });

  it('subscriber: resolves and does not call incrementScanCount', async () => {
    const result = await createMultiPhotoScanJob({
      userId: 'user-1',
      photoUris: ['uri1'],
      isSubscriber: true,
    });

    expect(result).toBeDefined();
    expect(result.id).toBe('job-1');
    expect(mockIncrementScanCount).not.toHaveBeenCalled();
  });
});

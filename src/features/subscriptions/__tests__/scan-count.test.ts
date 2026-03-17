// Mock @/lib/supabase before importing anything
const mockRpc = jest.fn();
const mockEq = jest.fn();
const mockMaybeSingle = jest.fn();
const mockSelect = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: mockRpc,
    from: mockFrom,
  },
}));

import { getScanCount, incrementScanCount } from '@/features/subscriptions/scan-count';
import { ScanLimitError } from '@/features/scan/errors';

describe('scan-count', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default chainable mock setup
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockEq.mockReturnValue({ eq: mockEq, maybeSingle: mockMaybeSingle });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    mockRpc.mockResolvedValue({ data: 1, error: null });
  });

  describe('getScanCount', () => {
    it('returns 0 when no row exists', async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });

      const result = await getScanCount('user-123');

      expect(mockFrom).toHaveBeenCalledWith('user_scan_counts');
      expect(result).toBe(0);
    });

    it('returns stored count', async () => {
      mockMaybeSingle.mockResolvedValue({
        data: { count: 7 },
        error: null,
      });

      const result = await getScanCount('user-123');

      expect(result).toBe(7);
    });
  });

  describe('incrementScanCount', () => {
    it('returns new count from RPC', async () => {
      mockRpc.mockResolvedValue({ data: 3, error: null });

      const result = await incrementScanCount('user-123');

      expect(mockRpc).toHaveBeenCalledWith('increment_scan_count', {
        p_user_id: 'user-123',
      });
      expect(result).toBe(3);
    });

    it('throws ScanLimitError when count exceeds 3', async () => {
      mockRpc.mockResolvedValue({ data: 4, error: null });

      await expect(incrementScanCount('user-123')).rejects.toBeInstanceOf(
        ScanLimitError
      );
    });

    it('propagates RPC errors', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      await expect(incrementScanCount('user-123')).rejects.toThrow(
        'Database connection failed'
      );
    });
  });
});

// Mock @/lib/supabase before importing anything
const mockGetSession = jest.fn();
const mockEq = jest.fn();
const mockOrder = jest.fn();
const mockSelect = jest.fn();
const mockFrom = jest.fn();
const mockOn = jest.fn();
const mockSubscribe = jest.fn();
const mockChannel = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
    },
    from: mockFrom,
    channel: mockChannel,
  },
}));

import { getUserScanJobs, subscribeToUserJobs } from '../scan-service';

describe('scan-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default chainable mock setup for supabase.from()
    mockEq.mockReturnThis();
    mockOrder.mockReturnValue({ data: [], error: null });
    mockSelect.mockReturnValue({ eq: mockEq, order: mockOrder });
    mockFrom.mockReturnValue({ select: mockSelect });

    // Default channel mock setup
    mockSubscribe.mockReturnValue({ unsubscribe: jest.fn() });
    mockOn.mockReturnValue({ subscribe: mockSubscribe });
    mockChannel.mockReturnValue({ on: mockOn });
  });

  describe('getUserScanJobs', () => {
    it('returns filtered jobs for authenticated user', async () => {
      const mockUser = { id: 'user-123' };
      mockGetSession.mockResolvedValue({ data: { session: { user: mockUser } } });

      // Chain: from('scan_jobs').select('*').eq('user_id', user.id).order(...)
      const mockJobs = [
        { id: 'job-1', user_id: 'user-123', status: 'completed' },
        { id: 'job-2', user_id: 'user-123', status: 'queued' },
      ];
      mockOrder.mockReturnValue({ data: mockJobs, error: null });
      mockEq.mockReturnValue({ order: mockOrder });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });

      const result = await getUserScanJobs();

      expect(mockGetSession).toHaveBeenCalled();
      expect(mockFrom).toHaveBeenCalledWith('scan_jobs');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(result).toEqual(mockJobs);
    });

    it('throws "Not authenticated" when no session', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      await expect(getUserScanJobs()).rejects.toThrow('Not authenticated');
    });
  });

  describe('subscribeToUserJobs', () => {
    it('accepts userId as first parameter', () => {
      const callback = jest.fn();
      subscribeToUserJobs('user-123', callback);

      expect(mockChannel).toHaveBeenCalledWith('user_scan_jobs');
    });

    it('passes correct filter string with userId', () => {
      const callback = jest.fn();
      subscribeToUserJobs('user-abc', callback);

      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: 'UPDATE',
          schema: 'public',
          table: 'scan_jobs',
          filter: 'user_id=eq.user-abc',
        }),
        expect.any(Function)
      );
    });

    it('returns the channel', () => {
      const callback = jest.fn();
      const mockChannelReturn = { on: mockOn };
      mockChannel.mockReturnValue(mockChannelReturn);
      mockOn.mockReturnValue({ subscribe: mockSubscribe });
      mockSubscribe.mockReturnValue(mockChannelReturn);

      const result = subscribeToUserJobs('user-123', callback);

      expect(result).toBeDefined();
    });
  });
});

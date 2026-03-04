// Mock @/lib/supabase before importing anything
const mockGetUser = jest.fn();
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
      getUser: mockGetUser,
    },
    from: mockFrom,
    channel: mockChannel,
  },
}));

// Mock RetryRecoveryService
const mockRetryJob = jest.fn();
jest.mock('@/lib/scan/retry-recovery-service', () => ({
  RetryRecoveryService: {
    retryJob: mockRetryJob,
  },
}));

import { getUserScanJobs, retryScanJob, subscribeToUserJobs } from '../scan-service';

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
      mockGetUser.mockResolvedValue({ data: { user: mockUser } });

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

      expect(mockGetUser).toHaveBeenCalled();
      expect(mockFrom).toHaveBeenCalledWith('scan_jobs');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(result).toEqual(mockJobs);
    });

    it('throws "Not authenticated" when no user', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      await expect(getUserScanJobs()).rejects.toThrow('Not authenticated');
    });
  });

  describe('retryScanJob', () => {
    it('delegates to RetryRecoveryService.retryJob with correct args', async () => {
      const mockUser = { id: 'user-456' };
      mockGetUser.mockResolvedValue({ data: { user: mockUser } });
      mockRetryJob.mockResolvedValue({ success: true, message: 'Retry scheduled' });

      await retryScanJob('job-789');

      expect(mockGetUser).toHaveBeenCalled();
      expect(mockRetryJob).toHaveBeenCalledWith('job-789', 'user-456');
    });

    it('throws when RetryRecoveryService returns failure', async () => {
      const mockUser = { id: 'user-456' };
      mockGetUser.mockResolvedValue({ data: { user: mockUser } });
      mockRetryJob.mockResolvedValue({ success: false, message: 'Max retries exceeded' });

      await expect(retryScanJob('job-789')).rejects.toThrow('Max retries exceeded');
    });

    it('throws "Not authenticated" when no user', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      await expect(retryScanJob('job-789')).rejects.toThrow('Not authenticated');
      expect(mockRetryJob).not.toHaveBeenCalled();
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

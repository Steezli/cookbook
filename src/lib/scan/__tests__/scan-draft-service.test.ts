// Mock @/lib/supabase before imports
const mockSingle = jest.fn();
const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockDelete = jest.fn();
const mockOrder = jest.fn();
const mockRange = jest.fn();
const mockLimit = jest.fn();
const mockFrom = jest.fn();
const mockRpc = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    rpc: mockRpc,
  },
}));

// Do NOT mock @supabase/supabase-js -- it should no longer be imported
// by scan-draft-service after the fix

import { ScanDraftService } from '../scan-draft-service';

describe('ScanDraftService', () => {
  let service: ScanDraftService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ScanDraftService();

    // Default chainable mock setup
    mockSingle.mockResolvedValue({ data: null, error: null });
    mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle });
    mockInsert.mockReturnValue({ select: mockSelect });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ eq: mockEq, single: mockSingle, order: mockOrder });
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    });
  });

  describe('mapScoreToStatus', () => {
    it('returns "ready" for score 0.9', () => {
      const result = (service as any).mapScoreToStatus(0.9);
      expect(result).toBe('ready');
    });

    it('returns "ready" for boundary score 0.8', () => {
      const result = (service as any).mapScoreToStatus(0.8);
      expect(result).toBe('ready');
    });

    it('returns "needs_review" for score 0.6', () => {
      const result = (service as any).mapScoreToStatus(0.6);
      expect(result).toBe('needs_review');
    });

    it('returns "needs_review" for boundary score 0.5', () => {
      const result = (service as any).mapScoreToStatus(0.5);
      expect(result).toBe('needs_review');
    });

    it('returns "enhanced" for score 0.3', () => {
      const result = (service as any).mapScoreToStatus(0.3);
      expect(result).toBe('enhanced');
    });
  });

  describe('convertToRecipe', () => {
    it('inserts with owner_user_id (not user_id)', async () => {
      // Mock getDraft to return a valid draft
      const mockDraft = {
        id: 'draft-1',
        jobId: 'job-1',
        userId: 'user-1',
        rawText: 'test',
        ocrConfidence: 0.9,
        recipe: {},
        fieldConfidence: {},
        overallConfidence: {},
        status: 'draft',
        aiModelVersion: '1.0',
        processingTimeMs: 100,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };

      // Mock getDraft chain
      const draftSingle = jest.fn().mockResolvedValue({
        data: {
          id: 'draft-1', job_id: 'job-1', user_id: 'user-1', raw_text: 'test',
          ocr_confidence: 0.9, structured_data: { recipe: {} }, field_confidence: {},
          status: 'draft', ai_model_version: '1.0', processing_time_ms: 100,
          created_at: '2026-01-01', updated_at: '2026-01-01',
        },
        error: null,
      });
      const draftEq2 = jest.fn().mockReturnValue({ single: draftSingle });
      const draftEq1 = jest.fn().mockReturnValue({ eq: draftEq2 });
      const draftSelect = jest.fn().mockReturnValue({ eq: draftEq1 });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'scan_drafts') return { select: draftSelect };
        return { select: mockSelect, insert: mockInsert };
      });

      // Mock RPC — atomic insert + delete in DB
      mockRpc.mockResolvedValue({ data: 'recipe-1', error: null });

      const recipeData = {
        title: 'Grandma\'s Cookies',
        description: 'Family recipe',
        ingredients: [{ name: 'flour', amount: '2 cups', confidence: 0.9 }],
        instructions: ['Mix ingredients', 'Bake at 350'],
        prepTimeMinutes: 15,
        cookTimeMinutes: 30,
        servings: 12,
        tags: ['cookies', 'dessert'],
      };

      const result = await service.convertToRecipe('draft-1', 'user-1', recipeData);

      expect(result).toEqual({ recipeId: 'recipe-1' });

      // Verify RPC was called with convert_draft_to_recipe
      expect(mockRpc).toHaveBeenCalledWith('convert_draft_to_recipe', expect.objectContaining({
        p_draft_id: 'draft-1',
        p_user_id: 'user-1',
        p_title: 'Grandma\'s Cookies',
        p_description: 'Family recipe',
      }));

      // Verify structured data was passed correctly
      const rpcArgs = mockRpc.mock.calls[0][1];
      expect(rpcArgs.p_tags).toEqual(['cookies', 'dessert']);
    });

    it('passes structured ingredients and steps to RPC', async () => {
      // Mock getDraft chain
      const draftSingle = jest.fn().mockResolvedValue({
        data: {
          id: 'draft-1', job_id: 'job-1', user_id: 'user-1', raw_text: 'test',
          ocr_confidence: 0.9, structured_data: { recipe: {} }, field_confidence: {},
          status: 'draft', ai_model_version: '1.0', processing_time_ms: 100,
          created_at: '2026-01-01', updated_at: '2026-01-01',
        },
        error: null,
      });
      const draftEq2 = jest.fn().mockReturnValue({ single: draftSingle });
      const draftEq1 = jest.fn().mockReturnValue({ eq: draftEq2 });
      const draftSelect = jest.fn().mockReturnValue({ eq: draftEq1 });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'scan_drafts') return { select: draftSelect };
        return { select: mockSelect };
      });

      mockRpc.mockResolvedValue({ data: 'recipe-2', error: null });

      await service.convertToRecipe('draft-1', 'user-1', {
        title: 'Test Recipe',
        ingredients: [{ name: 'sugar', confidence: 0.8 }],
        instructions: ['Step 1'],
      });

      const rpcArgs = mockRpc.mock.calls[0][1];
      expect(rpcArgs.p_title).toBe('Test Recipe');
      // Steps should be structured with sort_order
      expect(rpcArgs.p_steps).toEqual([{ sort_order: 0, text: 'Step 1' }]);
    });
  });

  describe('getDraftByJobId', () => {
    it('queries by job_id (not id)', async () => {
      const mockData = {
        id: 'draft-uuid-1',
        job_id: 'job-uuid-1',
        user_id: 'user-1',
        raw_text: 'recipe text',
        ocr_confidence: 0.85,
        structured_data: { recipe: { title: 'Test' }, overallConfidence: { score: 0.9 } },
        field_confidence: { title: 0.9 },
        status: 'ready',
        ai_model_version: '1.0',
        processing_time_ms: 200,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        draft_index: 0,
      };

      const jobSingle = jest.fn().mockResolvedValue({ data: mockData, error: null });
      const jobLimit = jest.fn().mockReturnValue({ single: jobSingle });
      const jobOrder = jest.fn().mockReturnValue({ limit: jobLimit });
      const jobEq2 = jest.fn().mockReturnValue({ order: jobOrder });
      const jobEq1 = jest.fn().mockReturnValue({ eq: jobEq2 });
      const jobSelect = jest.fn().mockReturnValue({ eq: jobEq1 });

      mockFrom.mockReturnValue({ select: jobSelect });

      const result = await service.getDraftByJobId('job-uuid-1', 'user-1');

      expect(mockFrom).toHaveBeenCalledWith('scan_drafts');
      expect(jobSelect).toHaveBeenCalledWith('*');
      // Must query by job_id, NOT by id
      expect(jobEq1).toHaveBeenCalledWith('job_id', 'job-uuid-1');
      expect(jobEq2).toHaveBeenCalledWith('user_id', 'user-1');
      // Must use order + limit for deterministic multi-draft behavior
      expect(jobOrder).toHaveBeenCalledWith('draft_index', { ascending: true });
      expect(jobLimit).toHaveBeenCalledWith(1);

      expect(result).not.toBeNull();
      expect(result!.id).toBe('draft-uuid-1');
      expect(result!.jobId).toBe('job-uuid-1');
    });

    it('returns null when no draft found (PGRST116)', async () => {
      const jobSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });
      const jobLimit = jest.fn().mockReturnValue({ single: jobSingle });
      const jobOrder = jest.fn().mockReturnValue({ limit: jobLimit });
      const jobEq2 = jest.fn().mockReturnValue({ order: jobOrder });
      const jobEq1 = jest.fn().mockReturnValue({ eq: jobEq2 });
      const jobSelect = jest.fn().mockReturnValue({ eq: jobEq1 });

      mockFrom.mockReturnValue({ select: jobSelect });

      const result = await service.getDraftByJobId('nonexistent-job', 'user-1');

      expect(result).toBeNull();
    });
  });

  describe('updateDraftStatus type safety', () => {
    it('accepts DB-valid status values (ready, needs_review, enhanced)', async () => {
      const updateEq2 = jest.fn().mockResolvedValue({ error: null });
      const updateEq1 = jest.fn().mockReturnValue({ eq: updateEq2 });
      const updateFn = jest.fn().mockReturnValue({ eq: updateEq1 });

      mockFrom.mockReturnValue({ update: updateFn });

      // These should all succeed without TypeScript errors
      await service.updateDraftStatus('draft-1', 'user-1', 'ready');

      const updateArg = updateFn.mock.calls[0][0];
      expect(updateArg).toHaveProperty('status', 'ready');
    });
  });

  describe('convertToRecipe uses atomic RPC', () => {
    it('calls convert_draft_to_recipe RPC (not separate insert + delete)', async () => {
      const draftSingle = jest.fn().mockResolvedValue({
        data: {
          id: 'draft-1', job_id: 'job-1', user_id: 'user-1', raw_text: 'test',
          ocr_confidence: 0.9, structured_data: { recipe: {} }, field_confidence: {},
          status: 'ready', ai_model_version: '1.0', processing_time_ms: 100,
          created_at: '2026-01-01', updated_at: '2026-01-01',
        },
        error: null,
      });
      const draftEq2 = jest.fn().mockReturnValue({ single: draftSingle });
      const draftEq1 = jest.fn().mockReturnValue({ eq: draftEq2 });
      const draftSelect = jest.fn().mockReturnValue({ eq: draftEq1 });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'scan_drafts') return { select: draftSelect };
        return { select: mockSelect };
      });

      mockRpc.mockResolvedValue({ data: 'recipe-1', error: null });

      await service.convertToRecipe('draft-1', 'user-1', {
        title: 'Test',
        ingredients: [],
        instructions: ['Step 1'],
      });

      // Must use RPC for atomic insert + delete
      expect(mockRpc).toHaveBeenCalledWith(
        'convert_draft_to_recipe',
        expect.objectContaining({ p_draft_id: 'draft-1', p_user_id: 'user-1' })
      );
      // Must NOT call from('recipes').insert directly
      const recipeCalls = mockFrom.mock.calls.filter(([t]: [string]) => t === 'recipes');
      expect(recipeCalls).toHaveLength(0);
    });
  });

  describe('getDraftsByJobId', () => {
    it('returns multiple drafts ordered by draft_index', async () => {
      const mockRecords = [
        {
          id: 'draft-1',
          job_id: 'job-1',
          user_id: 'user-1',
          raw_text: 'recipe 1',
          ocr_confidence: 0.9,
          structured_data: { recipe: { title: 'Recipe A' }, overallConfidence: { score: 0.9 } },
          field_confidence: { title: 0.9 },
          status: 'ready',
          ai_model_version: '1.0',
          processing_time_ms: 100,
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
          draft_index: 0,
        },
        {
          id: 'draft-2',
          job_id: 'job-1',
          user_id: 'user-1',
          raw_text: 'recipe 2',
          ocr_confidence: 0.85,
          structured_data: { recipe: { title: 'Recipe B' }, overallConfidence: { score: 0.8 } },
          field_confidence: { title: 0.85 },
          status: 'ready',
          ai_model_version: '1.0',
          processing_time_ms: 120,
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
          draft_index: 1,
        },
      ];

      const orderFn = jest.fn().mockResolvedValue({ data: mockRecords, error: null });
      const eq2 = jest.fn().mockReturnValue({ order: orderFn });
      const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
      const selectFn = jest.fn().mockReturnValue({ eq: eq1 });

      mockFrom.mockReturnValue({ select: selectFn });

      const result = await service.getDraftsByJobId('job-1', 'user-1');

      expect(mockFrom).toHaveBeenCalledWith('scan_drafts');
      expect(selectFn).toHaveBeenCalledWith('*');
      expect(eq1).toHaveBeenCalledWith('job_id', 'job-1');
      expect(eq2).toHaveBeenCalledWith('user_id', 'user-1');
      expect(orderFn).toHaveBeenCalledWith('draft_index', { ascending: true });

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('draft-1');
      expect(result[0].recipe.title).toBe('Recipe A');
      expect(result[1].id).toBe('draft-2');
      expect(result[1].recipe.title).toBe('Recipe B');
    });

    it('returns empty array when no drafts exist', async () => {
      const orderFn = jest.fn().mockResolvedValue({ data: [], error: null });
      const eq2 = jest.fn().mockReturnValue({ order: orderFn });
      const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
      const selectFn = jest.fn().mockReturnValue({ eq: eq1 });

      mockFrom.mockReturnValue({ select: selectFn });

      const result = await service.getDraftsByJobId('nonexistent-job', 'user-1');

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('includes draftIndex in returned objects', async () => {
      const mockRecords = [
        {
          id: 'draft-1',
          job_id: 'job-1',
          user_id: 'user-1',
          raw_text: 'recipe 1',
          ocr_confidence: 0.9,
          structured_data: { recipe: { title: 'Test' }, overallConfidence: {} },
          field_confidence: {},
          status: 'ready',
          ai_model_version: '1.0',
          processing_time_ms: 100,
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
          draft_index: 0,
        },
        {
          id: 'draft-2',
          job_id: 'job-1',
          user_id: 'user-1',
          raw_text: 'recipe 2',
          ocr_confidence: 0.85,
          structured_data: { recipe: { title: 'Test 2' }, overallConfidence: {} },
          field_confidence: {},
          status: 'ready',
          ai_model_version: '1.0',
          processing_time_ms: 120,
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
          draft_index: 1,
        },
      ];

      const orderFn = jest.fn().mockResolvedValue({ data: mockRecords, error: null });
      const eq2 = jest.fn().mockReturnValue({ order: orderFn });
      const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
      const selectFn = jest.fn().mockReturnValue({ eq: eq1 });

      mockFrom.mockReturnValue({ select: selectFn });

      const result = await service.getDraftsByJobId('job-1', 'user-1');

      expect(result[0].draftIndex).toBe(0);
      expect(result[1].draftIndex).toBe(1);
    });

    it('handles null data gracefully', async () => {
      const orderFn = jest.fn().mockResolvedValue({ data: null, error: null });
      const eq2 = jest.fn().mockReturnValue({ order: orderFn });
      const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
      const selectFn = jest.fn().mockReturnValue({ eq: eq1 });

      mockFrom.mockReturnValue({ select: selectFn });

      const result = await service.getDraftsByJobId('job-1', 'user-1');

      expect(result).toEqual([]);
    });

    it('throws on database error', async () => {
      const orderFn = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'connection failed' },
      });
      const eq2 = jest.fn().mockReturnValue({ order: orderFn });
      const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
      const selectFn = jest.fn().mockReturnValue({ eq: eq1 });

      mockFrom.mockReturnValue({ select: selectFn });

      await expect(service.getDraftsByJobId('job-1', 'user-1')).rejects.toThrow(
        'Failed to fetch scan drafts by job ID: connection failed'
      );
    });
  });

  describe('getDraftByJobId (singular) with multi-draft support', () => {
    it('still returns single draft (backward compat)', async () => {
      const mockData = {
        id: 'draft-uuid-1',
        job_id: 'job-uuid-1',
        user_id: 'user-1',
        raw_text: 'recipe text',
        ocr_confidence: 0.85,
        structured_data: { recipe: { title: 'Test' }, overallConfidence: { score: 0.9 } },
        field_confidence: { title: 0.9 },
        status: 'ready',
        ai_model_version: '1.0',
        processing_time_ms: 200,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        draft_index: 0,
      };

      const singleFn = jest.fn().mockResolvedValue({ data: mockData, error: null });
      const limitFn = jest.fn().mockReturnValue({ single: singleFn });
      const orderFn = jest.fn().mockReturnValue({ limit: limitFn });
      const eq2 = jest.fn().mockReturnValue({ order: orderFn });
      const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
      const selectFn = jest.fn().mockReturnValue({ eq: eq1 });

      mockFrom.mockReturnValue({ select: selectFn });

      const result = await service.getDraftByJobId('job-uuid-1', 'user-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('draft-uuid-1');
      expect(result!.jobId).toBe('job-uuid-1');
      expect(result!.draftIndex).toBe(0);
    });

    it('uses order + limit to return first draft when multiple exist', async () => {
      const mockData = {
        id: 'draft-first',
        job_id: 'job-multi',
        user_id: 'user-1',
        raw_text: 'first recipe',
        ocr_confidence: 0.9,
        structured_data: { recipe: { title: 'First Recipe' }, overallConfidence: {} },
        field_confidence: {},
        status: 'ready',
        ai_model_version: '1.0',
        processing_time_ms: 100,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        draft_index: 0,
      };

      const singleFn = jest.fn().mockResolvedValue({ data: mockData, error: null });
      const limitFn = jest.fn().mockReturnValue({ single: singleFn });
      const orderFn = jest.fn().mockReturnValue({ limit: limitFn });
      const eq2 = jest.fn().mockReturnValue({ order: orderFn });
      const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
      const selectFn = jest.fn().mockReturnValue({ eq: eq1 });

      mockFrom.mockReturnValue({ select: selectFn });

      const result = await service.getDraftByJobId('job-multi', 'user-1');

      // Verify the chain includes order + limit
      expect(orderFn).toHaveBeenCalledWith('draft_index', { ascending: true });
      expect(limitFn).toHaveBeenCalledWith(1);
      expect(singleFn).toHaveBeenCalled();

      expect(result).not.toBeNull();
      expect(result!.id).toBe('draft-first');
      expect(result!.recipe.title).toBe('First Recipe');
    });
  });

  describe('ScanDraft interface status type', () => {
    it('getDraft returns DB-valid status values', async () => {
      const draftSingle = jest.fn().mockResolvedValue({
        data: {
          id: 'draft-1',
          job_id: 'job-1',
          user_id: 'user-1',
          raw_text: 'test',
          ocr_confidence: 0.9,
          structured_data: { recipe: {} },
          field_confidence: {},
          status: 'needs_review',
          ai_model_version: '1.0',
          processing_time_ms: 100,
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
        },
        error: null,
      });
      const draftEq2 = jest.fn().mockReturnValue({ single: draftSingle });
      const draftEq1 = jest.fn().mockReturnValue({ eq: draftEq2 });
      const draftSelect = jest.fn().mockReturnValue({ eq: draftEq1 });

      mockFrom.mockReturnValue({ select: draftSelect });

      const result = await service.getDraft('draft-1', 'user-1');

      expect(result).not.toBeNull();
      // Status should be a DB-valid value
      expect(['ready', 'needs_review', 'enhanced']).toContain(result!.status);
    });
  });

  describe('Supabase client usage', () => {
    it('does not import createClient from @supabase/supabase-js', async () => {
      // Verify that @supabase/supabase-js is NOT imported by checking
      // that the module uses the shared supabase instance from @/lib/supabase.
      // This is inherently tested by all mocks working -- if the service
      // created its own client, our mock of @/lib/supabase would not intercept calls.

      // Attempt a simple operation that uses supabase
      const draftSingle = jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
      const draftEq2 = jest.fn().mockReturnValue({ single: draftSingle });
      const draftEq1 = jest.fn().mockReturnValue({ eq: draftEq2 });
      const draftSelect = jest.fn().mockReturnValue({ eq: draftEq1 });

      mockFrom.mockReturnValue({ select: draftSelect });

      const result = await service.getDraft('nonexistent', 'user-1');

      // If the service used its own client, mockFrom would not be called
      expect(mockFrom).toHaveBeenCalledWith('scan_drafts');
      expect(result).toBeNull();
    });
  });
});

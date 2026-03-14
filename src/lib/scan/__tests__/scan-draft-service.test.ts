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

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
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

      // Mock getDraft chain: from('scan_drafts').select('*').eq('id', ...).eq('user_id', ...).single()
      const draftSingle = jest.fn().mockResolvedValue({
        data: {
          id: 'draft-1',
          job_id: 'job-1',
          user_id: 'user-1',
          raw_text: 'test',
          ocr_confidence: 0.9,
          structured_data: { recipe: {} },
          field_confidence: {},
          status: 'draft',
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

      // Mock insert chain: from('recipes').insert(...).select('id').single()
      const recipeSingle = jest.fn().mockResolvedValue({
        data: { id: 'recipe-1' },
        error: null,
      });
      const recipeSelect = jest.fn().mockReturnValue({ single: recipeSingle });
      const recipeInsert = jest.fn().mockReturnValue({ select: recipeSelect });

      // Mock update chain for status update: from('scan_drafts').update(...).eq(...).eq(...)
      const updateEq2 = jest.fn().mockResolvedValue({ error: null });
      const updateEq1 = jest.fn().mockReturnValue({ eq: updateEq2 });
      const updateFn = jest.fn().mockReturnValue({ eq: updateEq1 });

      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === 'scan_drafts') {
          callCount++;
          if (callCount <= 1) {
            // First call: getDraft
            return { select: draftSelect };
          } else {
            // Second call: updateDraftStatus
            return { update: updateFn };
          }
        }
        if (table === 'recipes') {
          return { insert: recipeInsert };
        }
        return { select: mockSelect, insert: mockInsert };
      });

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

      // Verify the insert was called with correct column names
      const insertArg = recipeInsert.mock.calls[0][0];

      // MUST use owner_user_id (not user_id)
      expect(insertArg).toHaveProperty('owner_user_id', 'user-1');
      expect(insertArg).not.toHaveProperty('user_id');

      // MUST use steps (not instructions)
      expect(insertArg).toHaveProperty('steps', [
        { sort_order: 0, text: 'Mix ingredients' },
        { sort_order: 1, text: 'Bake at 350' },
      ]);
      expect(insertArg).not.toHaveProperty('instructions');

      // MUST NOT have status column
      expect(insertArg).not.toHaveProperty('status');

      // MUST NOT have scan_draft_id column
      expect(insertArg).not.toHaveProperty('scan_draft_id');

      // MUST have visibility set to 'private'
      expect(insertArg).toHaveProperty('visibility', 'private');

      // MUST NOT have created_at (database auto-generates)
      expect(insertArg).not.toHaveProperty('created_at');

      // MUST NOT have category (not a column on recipes table)
      expect(insertArg).not.toHaveProperty('category');
    });

    it('includes standard recipe columns', async () => {
      // Mock getDraft chain
      const draftSingle = jest.fn().mockResolvedValue({
        data: {
          id: 'draft-1',
          job_id: 'job-1',
          user_id: 'user-1',
          raw_text: 'test',
          ocr_confidence: 0.9,
          structured_data: { recipe: {} },
          field_confidence: {},
          status: 'draft',
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

      const recipeSingle = jest.fn().mockResolvedValue({
        data: { id: 'recipe-2' },
        error: null,
      });
      const recipeSelect = jest.fn().mockReturnValue({ single: recipeSingle });
      const recipeInsert = jest.fn().mockReturnValue({ select: recipeSelect });

      const updateEq2 = jest.fn().mockResolvedValue({ error: null });
      const updateEq1 = jest.fn().mockReturnValue({ eq: updateEq2 });
      const updateFn = jest.fn().mockReturnValue({ eq: updateEq1 });

      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === 'scan_drafts') {
          callCount++;
          if (callCount <= 1) {
            return { select: draftSelect };
          } else {
            return { update: updateFn };
          }
        }
        if (table === 'recipes') {
          return { insert: recipeInsert };
        }
        return { select: mockSelect };
      });

      const recipeData = {
        title: 'Test Recipe',
        ingredients: [{ name: 'sugar', confidence: 0.8 }],
        instructions: ['Step 1'],
      };

      await service.convertToRecipe('draft-1', 'user-1', recipeData);

      const insertArg = recipeInsert.mock.calls[0][0];

      // Verify standard columns are present
      expect(insertArg).toHaveProperty('title', 'Test Recipe');
      expect(insertArg).toHaveProperty('ingredients');
      expect(insertArg).toHaveProperty('steps', [
        { sort_order: 0, text: 'Step 1' },
      ]);
      expect(insertArg).toHaveProperty('owner_user_id', 'user-1');
      expect(insertArg).toHaveProperty('visibility', 'private');
      expect(insertArg).toHaveProperty('tags');
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

  describe('convertToRecipe status value', () => {
    it('calls updateDraftStatus with "ready" (not "approved")', async () => {
      // Mock getDraft chain
      const draftSingle = jest.fn().mockResolvedValue({
        data: {
          id: 'draft-1',
          job_id: 'job-1',
          user_id: 'user-1',
          raw_text: 'test',
          ocr_confidence: 0.9,
          structured_data: { recipe: {} },
          field_confidence: {},
          status: 'ready',
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

      const recipeSingle = jest.fn().mockResolvedValue({
        data: { id: 'recipe-1' },
        error: null,
      });
      const recipeSelect = jest.fn().mockReturnValue({ single: recipeSingle });
      const recipeInsert = jest.fn().mockReturnValue({ select: recipeSelect });

      const updateEq2 = jest.fn().mockResolvedValue({ error: null });
      const updateEq1 = jest.fn().mockReturnValue({ eq: updateEq2 });
      const updateFn = jest.fn().mockReturnValue({ eq: updateEq1 });

      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === 'scan_drafts') {
          callCount++;
          if (callCount <= 1) {
            return { select: draftSelect };
          } else {
            return { update: updateFn };
          }
        }
        if (table === 'recipes') {
          return { insert: recipeInsert };
        }
        return { select: mockSelect };
      });

      await service.convertToRecipe('draft-1', 'user-1', {
        title: 'Test',
        ingredients: [],
        instructions: ['Step 1'],
      });

      // The updateDraftStatus call should pass 'ready' (not 'approved')
      const statusUpdateArg = updateFn.mock.calls[0][0];
      expect(statusUpdateArg).toHaveProperty('status', 'ready');
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

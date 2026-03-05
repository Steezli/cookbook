import { getPublicRecipeAuthor, getPublicRecipeAuthors } from '../public';

// Mock supabase
const mockRpc = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getPublicRecipeAuthor', () => {
  it('returns correct shape from RPC response', async () => {
    mockRpc.mockResolvedValue({
      data: [{ display_name: 'Maria Torres', initials: 'MT' }],
      error: null,
    });

    const result = await getPublicRecipeAuthor('recipe-1');

    expect(mockRpc).toHaveBeenCalledWith('get_public_recipe_author', {
      p_recipe_id: 'recipe-1',
    });
    expect(result).toEqual({ display_name: 'Maria Torres', initials: 'MT' });
  });

  it('returns fallback when RPC returns empty', async () => {
    mockRpc.mockResolvedValue({
      data: [],
      error: null,
    });

    const result = await getPublicRecipeAuthor('nonexistent');

    expect(result).toEqual({ display_name: null, initials: 'U' });
  });

  it('returns fallback when RPC returns null data', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: null,
    });

    const result = await getPublicRecipeAuthor('nonexistent');

    expect(result).toEqual({ display_name: null, initials: 'U' });
  });

  it('throws on RPC error', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'RPC failed' },
    });

    await expect(getPublicRecipeAuthor('recipe-1')).rejects.toEqual({
      message: 'RPC failed',
    });
  });
});

describe('getPublicRecipeAuthors', () => {
  it('maps result array to Record keyed by recipe_id', async () => {
    mockRpc.mockResolvedValue({
      data: [
        { recipe_id: 'r1', display_name: 'Maria Torres', initials: 'MT' },
        { recipe_id: 'r2', display_name: 'John', initials: 'J' },
      ],
      error: null,
    });

    const result = await getPublicRecipeAuthors(['r1', 'r2']);

    expect(mockRpc).toHaveBeenCalledWith('get_public_recipe_authors', {
      p_recipe_ids: ['r1', 'r2'],
    });
    expect(result).toEqual({
      r1: { display_name: 'Maria Torres', initials: 'MT' },
      r2: { display_name: 'John', initials: 'J' },
    });
  });

  it('skips RPC call for empty input array', async () => {
    const result = await getPublicRecipeAuthors([]);

    expect(mockRpc).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });

  it('throws on RPC error', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'Batch RPC failed' },
    });

    await expect(getPublicRecipeAuthors(['r1'])).rejects.toEqual({
      message: 'Batch RPC failed',
    });
  });
});

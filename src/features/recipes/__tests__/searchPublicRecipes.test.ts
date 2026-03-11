import { searchPublicRecipes, getPublicRecipeCount } from '../search';

// Chainable query builder mock
function createMockBuilder(result: { data: unknown; error: unknown; count?: number | null }) {
  const builder: Record<string, jest.Mock> = {};

  const chain = () =>
    new Proxy(builder, {
      get: (_target, prop: string) => {
        if (prop === 'then') {
          // Make it thenable — resolves with result
          return (resolve: (v: unknown) => void) => resolve(result);
        }
        if (!builder[prop]) {
          builder[prop] = jest.fn().mockReturnValue(chain());
        }
        return builder[prop];
      },
    });

  return { proxy: chain(), builder };
}

let latestBuilder: Record<string, jest.Mock>;
let latestResult: { data: unknown; error: unknown; count?: number | null };

const mockFrom = jest.fn().mockImplementation(() => {
  const { proxy, builder } = createMockBuilder(latestResult);
  latestBuilder = builder;
  return proxy;
});

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

function makeRecipes(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `recipe-${i}`,
    title: `Recipe ${i}`,
    visibility: 'public',
    tags: ['Dinner'],
    created_at: new Date(2026, 0, count - i).toISOString(),
  }));
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('searchPublicRecipes', () => {
  it('returns first page with no filters', async () => {
    // 21 results means hasMore=true (pageSize+1)
    latestResult = { data: makeRecipes(21), error: null };

    const result = await searchPublicRecipes();

    expect(mockFrom).toHaveBeenCalledWith('recipes');
    expect(latestBuilder['select']).toHaveBeenCalledWith('*');
    expect(latestBuilder['eq']).toHaveBeenCalledWith('visibility', 'public');
    expect(latestBuilder['order']).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(latestBuilder['range']).toHaveBeenCalledWith(0, 20); // 0 to pageSize (inclusive)
    expect(result.recipes).toHaveLength(20);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toEqual({ page: 1 });
  });

  it('returns hasMore=false when fewer than pageSize+1 results', async () => {
    latestResult = { data: makeRecipes(15), error: null };

    const result = await searchPublicRecipes();

    expect(result.recipes).toHaveLength(15);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it('applies query filter with ilike', async () => {
    latestResult = { data: makeRecipes(5), error: null };

    await searchPublicRecipes({ query: 'pasta' });

    expect(latestBuilder['ilike']).toHaveBeenCalledWith('title', '%pasta%');
  });

  it('trims query before applying', async () => {
    latestResult = { data: makeRecipes(5), error: null };

    await searchPublicRecipes({ query: '  pasta  ' });

    expect(latestBuilder['ilike']).toHaveBeenCalledWith('title', '%pasta%');
  });

  it('does not apply ilike for empty query', async () => {
    latestResult = { data: makeRecipes(5), error: null };

    await searchPublicRecipes({ query: '   ' });

    expect(latestBuilder['ilike']).toBeUndefined();
  });

  it('applies tag filter with overlaps', async () => {
    latestResult = { data: makeRecipes(5), error: null };

    await searchPublicRecipes({ tag: 'Dinner' });

    expect(latestBuilder['overlaps']).toHaveBeenCalledWith('tags', ['Dinner']);
  });

  it('does NOT apply overlaps when tag is "All"', async () => {
    latestResult = { data: makeRecipes(5), error: null };

    await searchPublicRecipes({ tag: 'All' });

    expect(latestBuilder['overlaps']).toBeUndefined();
  });

  it('uses correct range offset with cursor', async () => {
    latestResult = { data: makeRecipes(10), error: null };

    await searchPublicRecipes({ cursor: { page: 2 } });

    // page 2, pageSize 20 -> from=40, to=60
    expect(latestBuilder['range']).toHaveBeenCalledWith(40, 60);
  });

  it('nextCursor increments page number', async () => {
    latestResult = { data: makeRecipes(21), error: null };

    const result = await searchPublicRecipes({ cursor: { page: 3 } });

    expect(result.nextCursor).toEqual({ page: 4 });
  });

  it('respects custom pageSize', async () => {
    latestResult = { data: makeRecipes(11), error: null };

    const result = await searchPublicRecipes({ pageSize: 10 });

    expect(latestBuilder['range']).toHaveBeenCalledWith(0, 10);
    expect(result.recipes).toHaveLength(10);
    expect(result.hasMore).toBe(true);
  });

  it('throws on query error', async () => {
    latestResult = { data: null, error: { message: 'Query failed' } };

    await expect(searchPublicRecipes()).rejects.toEqual({ message: 'Query failed' });
  });
});

describe('getPublicRecipeCount', () => {
  it('returns exact count', async () => {
    latestResult = { data: null, error: null, count: 248 };

    const count = await getPublicRecipeCount();

    expect(latestBuilder['select']).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(latestBuilder['eq']).toHaveBeenCalledWith('visibility', 'public');
    expect(count).toBe(248);
  });

  it('applies query and tag filters', async () => {
    latestResult = { data: null, error: null, count: 42 };

    await getPublicRecipeCount({ query: 'pasta', tag: 'Dinner' });

    expect(latestBuilder['ilike']).toHaveBeenCalledWith('title', '%pasta%');
    expect(latestBuilder['overlaps']).toHaveBeenCalledWith('tags', ['Dinner']);
  });

  it('does not apply tag filter for "All"', async () => {
    latestResult = { data: null, error: null, count: 100 };

    await getPublicRecipeCount({ tag: 'All' });

    expect(latestBuilder['overlaps']).toBeUndefined();
  });

  it('returns 0 when count is null', async () => {
    latestResult = { data: null, error: null, count: null };

    const count = await getPublicRecipeCount();

    expect(count).toBe(0);
  });
});

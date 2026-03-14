import {
  getFirstRecipePhotos,
  getRecipeThumbnailUrlMap,
  getPhotoUrl,
  getThumbnailUrl,
} from '../photos';

// Mock supabase
const mockRpc = jest.fn();
const mockGetPublicUrl = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    storage: {
      from: () => ({
        getPublicUrl: (path: string) => mockGetPublicUrl(path),
      }),
    },
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockGetPublicUrl.mockImplementation((path: string) => ({
    data: { publicUrl: `https://storage.example.com/${path}` },
  }));
});

describe('getFirstRecipePhotos', () => {
  it('returns empty object for empty recipeIds', async () => {
    const result = await getFirstRecipePhotos([]);
    expect(result).toEqual({});
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('calls RPC with recipe_ids and returns keyed result', async () => {
    const photo1 = {
      id: 'p1',
      recipe_id: 'r1',
      storage_path: 'r1/photo.jpg',
      sort_order: 0,
      created_at: '2026-01-01T00:00:00Z',
    };
    const photo2 = {
      id: 'p2',
      recipe_id: 'r2',
      storage_path: 'r2/photo.jpg',
      sort_order: 0,
      created_at: '2026-01-01T00:00:00Z',
    };

    mockRpc.mockResolvedValue({ data: [photo1, photo2], error: null });

    const result = await getFirstRecipePhotos(['r1', 'r2']);

    expect(mockRpc).toHaveBeenCalledWith('get_first_recipe_photos', {
      recipe_ids: ['r1', 'r2'],
    });
    expect(result).toEqual({ r1: photo1, r2: photo2 });
  });

  it('returns one entry per recipe (DISTINCT ON guarantees)', async () => {
    const photo = {
      id: 'p1',
      recipe_id: 'r1',
      storage_path: 'r1/first.jpg',
      sort_order: 0,
      created_at: '2026-01-01T00:00:00Z',
    };

    mockRpc.mockResolvedValue({ data: [photo], error: null });

    const result = await getFirstRecipePhotos(['r1']);
    expect(Object.keys(result)).toHaveLength(1);
    expect(result['r1']).toEqual(photo);
  });

  it('throws on RPC error', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'rpc failed', code: '42883' },
    });

    await expect(getFirstRecipePhotos(['r1'])).rejects.toEqual({
      message: 'rpc failed',
      code: '42883',
    });
  });
});

describe('getRecipeThumbnailUrlMap', () => {
  it('returns URL map keyed by recipe id', async () => {
    const photo = {
      id: 'p1',
      recipe_id: 'r1',
      storage_path: 'r1/photo.jpg',
      sort_order: 0,
      created_at: '2026-01-01T00:00:00Z',
    };
    mockRpc.mockResolvedValue({ data: [photo], error: null });

    const result = await getRecipeThumbnailUrlMap(['r1'], 300);

    expect(result).toEqual({
      r1: 'https://storage.example.com/r1/photo.jpg?width=300&quality=80',
    });
  });

  it('returns empty map when no photos', async () => {
    const result = await getRecipeThumbnailUrlMap([]);
    expect(result).toEqual({});
  });
});

describe('getPhotoUrl', () => {
  it('returns public URL from storage', () => {
    const url = getPhotoUrl('r1/photo.jpg');
    expect(url).toBe('https://storage.example.com/r1/photo.jpg');
  });
});

describe('getThumbnailUrl', () => {
  it('appends width and quality params', () => {
    const url = getThumbnailUrl('r1/photo.jpg', 120);
    expect(url).toBe(
      'https://storage.example.com/r1/photo.jpg?width=120&quality=80'
    );
  });

  it('uses default width of 300', () => {
    const url = getThumbnailUrl('r1/photo.jpg');
    expect(url).toBe(
      'https://storage.example.com/r1/photo.jpg?width=300&quality=80'
    );
  });
});

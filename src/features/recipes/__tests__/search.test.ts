import { getAvailableTags, escapeLikePattern } from '../search';

// Mock supabase with chainable query builder
const mockNeq = jest.fn();
const mockSelect = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: (...args: unknown[]) => {
        mockSelect(...args);
        return { neq: mockNeq };
      },
    }),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getAvailableTags', () => {
  it('filters empty tag arrays at DB level with .neq', async () => {
    mockNeq.mockResolvedValue({
      data: [
        { tags: ['italian', 'pasta'] },
        { tags: ['italian', 'soup'] },
      ],
      error: null,
    });

    const result = await getAvailableTags();

    expect(mockSelect).toHaveBeenCalledWith('tags');
    expect(mockNeq).toHaveBeenCalledWith('tags', '{}');
    expect(result).toEqual(['italian', 'pasta', 'soup']);
  });

  it('returns empty array when no recipes have tags', async () => {
    mockNeq.mockResolvedValue({ data: [], error: null });

    const result = await getAvailableTags();
    expect(result).toEqual([]);
  });

  it('deduplicates tags across recipes', async () => {
    mockNeq.mockResolvedValue({
      data: [
        { tags: ['dessert', 'chocolate'] },
        { tags: ['chocolate', 'cake'] },
      ],
      error: null,
    });

    const result = await getAvailableTags();
    expect(result).toEqual(['cake', 'chocolate', 'dessert']);
  });

  it('throws on supabase error', async () => {
    mockNeq.mockResolvedValue({
      data: null,
      error: { message: 'query failed' },
    });

    await expect(getAvailableTags()).rejects.toEqual({
      message: 'query failed',
    });
  });
});

describe('escapeLikePattern', () => {
  it('escapes percent signs', () => {
    expect(escapeLikePattern('100%')).toBe('100\\%');
  });

  it('escapes underscores', () => {
    expect(escapeLikePattern('a_b')).toBe('a\\_b');
  });

  it('escapes backslashes before other chars', () => {
    expect(escapeLikePattern('a\\b%c_d')).toBe('a\\\\b\\%c\\_d');
  });

  it('returns plain string unchanged', () => {
    expect(escapeLikePattern('chicken soup')).toBe('chicken soup');
  });
});

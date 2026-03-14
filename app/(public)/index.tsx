import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { UtensilsCrossed } from 'lucide-react-native';

import { useBreakpoint } from '@/lib/hooks/useBreakpoint';
import type { Breakpoint } from '@/lib/hooks/useBreakpoint';
import { PublicBrowseHeader } from '@/components/public/PublicNavHeader';
import AdSlot from '@/components/public/AdSlot';
import {
  searchPublicRecipes,
  getPublicRecipeCount,
} from '@/features/recipes/search';
import type {
  PublicBrowseCursor,
  PublicBrowsePage,
} from '@/features/recipes/search';
import {
  getPublicRecipeAuthors,
} from '@/features/recipes/public';
import type { PublicAuthor } from '@/features/recipes/public';
import { getRecipeThumbnailUrlMap } from '@/features/recipes/photos';
import type { Recipe } from '@/features/recipes/types';
import { formatMetadataLine } from '@/components/recipes/recipeCardUtils';
import {
  accentWarm,
  bgCard,
  bgPage,
  fontFamilyBody,
  fontFamilyBodyMedium,
  noPhotoBg,
  noPhotoIcon,
  radiusMd,
  radiusPill,
  radiusSm,
  textPrimary,
  textSecondary,
  textTertiary,
  white,
} from '@/lib/tokens';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 300;

const WEB_CHIPS = ['All', 'Dinner', 'Baking', 'Dessert', 'Quick', 'Vegetarian', 'Comfort'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildMetaLine(recipe: Recipe): string {
  const base = formatMetadataLine(
    recipe.prep_time_minutes,
    recipe.cook_time_minutes,
    recipe.servings,
  );
  const tagSlice = (recipe.tags ?? []).slice(0, 2);
  if (tagSlice.length === 0) return base;
  const tagStr = tagSlice.join(' . ');
  return base ? `${base} . ${tagStr}` : tagStr;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function NoPhotoPlaceholder({ size, iconSize }: { size: number | '100%'; iconSize: number }) {
  return (
    <View
      style={{
        width: size,
        height: typeof size === 'number' ? size : 140,
        backgroundColor: noPhotoBg,
        borderRadius: typeof size === 'number' ? 10 : 0,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <UtensilsCrossed size={iconSize} color={noPhotoIcon} />
    </View>
  );
}

/** Mobile list row — 72px thumbnail + info column */
function PublicListRow({
  recipe,
  thumbnailUrl,
  author,
  onPress,
}: {
  recipe: Recipe;
  thumbnailUrl: string | undefined;
  author: PublicAuthor | undefined;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`View recipe: ${recipe.title}`}
      style={{
        flexDirection: 'row',
        backgroundColor: bgCard,
        borderRadius: radiusSm,
        padding: 12,
        gap: 12,
        alignItems: 'center',
      }}
    >
      {thumbnailUrl ? (
        <Image
          source={{ uri: thumbnailUrl }}
          style={{ width: 72, height: 72, borderRadius: 10 }}
          resizeMode="cover"
        />
      ) : (
        <NoPhotoPlaceholder size={72} iconSize={24} />
      )}
      <View style={{ flex: 1, gap: 4 }}>
        <Text
          numberOfLines={2}
          style={{
            fontSize: 15,
            fontFamily: fontFamilyBodyMedium,
            color: textPrimary,
          }}
        >
          {recipe.title}
        </Text>
        <Text
          style={{
            fontSize: 12,
            fontFamily: fontFamilyBody,
            color: textSecondary,
          }}
        >
          {buildMetaLine(recipe)}
        </Text>
        {author && (
          <Text
            style={{
              fontSize: 11,
              fontFamily: fontFamilyBody,
              color: textTertiary,
            }}
          >
            By {author.display_name ?? 'Anonymous'}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

/** Card used for tablet (2-col) and web (4-col) grid layouts */
function PublicRecipeCard({
  recipe,
  thumbnailUrl,
  author,
  onPress,
  isWeb,
}: {
  recipe: Recipe;
  thumbnailUrl: string | undefined;
  author: PublicAuthor | undefined;
  onPress: () => void;
  isWeb?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`View recipe: ${recipe.title}`}
      style={{
        flex: 1,
        backgroundColor: bgCard,
        borderRadius: radiusMd,
        overflow: 'hidden',
      }}
    >
      {thumbnailUrl ? (
        <Image
          source={{ uri: thumbnailUrl }}
          style={{ width: '100%', height: 140 }}
          resizeMode="cover"
        />
      ) : (
        <NoPhotoPlaceholder size="100%" iconSize={32} />
      )}
      <View style={{ padding: 14, gap: 4 }}>
        <Text
          numberOfLines={2}
          style={{
            fontSize: isWeb ? 14 : 15,
            fontFamily: fontFamilyBodyMedium,
            color: textPrimary,
          }}
        >
          {recipe.title}
        </Text>
        <Text
          style={{
            fontSize: isWeb ? 11 : 12,
            fontFamily: fontFamilyBody,
            color: textSecondary,
          }}
        >
          {buildMetaLine(recipe)}
        </Text>
        {author && (
          <Text
            style={{
              fontSize: isWeb ? 10 : 11,
              fontFamily: fontFamilyBody,
              color: textTertiary,
            }}
          >
            By {author.display_name ?? 'Anonymous'}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

/** Count/Sort row shared by mobile and tablet */
function CountSortRow({ totalCount }: { totalCount: number }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontFamily: fontFamilyBody,
          color: textSecondary,
        }}
      >
        {totalCount} public recipes
      </Text>
      <Text
        style={{
          fontSize: 12,
          fontFamily: fontFamilyBodyMedium,
          color: accentWarm,
        }}
      >
        Sort: Popular
      </Text>
    </View>
  );
}

/** Web-only filter chips row rendered inside FlatList ListHeaderComponent */
function WebChipsRow({
  selectedTag,
  onTagChange,
  totalCount,
}: {
  selectedTag: string;
  onTagChange: (tag: string) => void;
  totalCount: number;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {WEB_CHIPS.map((tag) => {
            const isActive = tag === selectedTag;
            return (
              <Pressable
                key={tag}
                onPress={() => onTagChange(tag)}
                accessibilityRole="button"
                accessibilityLabel={`Filter by ${tag}`}
                accessibilityState={{ selected: isActive }}
                style={{
                  backgroundColor: isActive ? accentWarm : bgCard,
                  borderRadius: radiusPill,
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: fontFamilyBodyMedium,
                    color: isActive ? white : textSecondary,
                  }}
                >
                  {tag}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <Text
            style={{
              fontSize: 13,
              fontFamily: fontFamilyBody,
              color: textSecondary,
            }}
          >
            {totalCount} public recipes
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontFamily: fontFamilyBodyMedium,
              color: accentWarm,
            }}
          >
            Sort: Popular
          </Text>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function PublicBrowseScreen() {
  const router = useRouter();
  const { breakpoint } = useBreakpoint();

  // State
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [cursor, setCursor] = useState<PublicBrowseCursor | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');
  const [totalCount, setTotalCount] = useState(0);
  const [authorMap, setAuthorMap] = useState<Record<string, PublicAuthor>>({});
  const [thumbnailMap, setThumbnailMap] = useState<Record<string, string>>({});
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadSeqRef = useRef(0);
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

  // Data loading
  const loadPage = useCallback(
    async (pageCursor: PublicBrowseCursor | null, seq: number) => {
      try {
        const isFirstPage = pageCursor === null;

        const result: PublicBrowsePage = await searchPublicRecipes({
          query: searchQuery || undefined,
          tag: selectedTag,
          cursor: pageCursor ?? undefined,
          pageSize: PAGE_SIZE,
        });

        // Stale guard
        if (seq !== loadSeqRef.current) return;

        const newIds = result.recipes.map((r) => r.id);

        // Batch-fetch authors + thumbnails in parallel
        const [authors, thumbs] = await Promise.all([
          getPublicRecipeAuthors(newIds),
          getRecipeThumbnailUrlMap(newIds, 300),
        ]);

        // Stale guard again after async
        if (seq !== loadSeqRef.current) return;

        if (isFirstPage) {
          setRecipes(result.recipes);
          setAuthorMap(authors);
          setThumbnailMap(thumbs);

          // Get total count on first page
          const count = await getPublicRecipeCount({
            query: searchQuery || undefined,
            tag: selectedTag,
          });
          if (seq === loadSeqRef.current) {
            setTotalCount(count);
          }
        } else {
          setRecipes((prev) => [...prev, ...result.recipes]);
          setAuthorMap((prev) => ({ ...prev, ...authors }));
          setThumbnailMap((prev) => ({ ...prev, ...thumbs }));
        }

        setCursor(result.nextCursor);
        setHasMore(result.hasMore);
        setError(false);
      } catch {
        setError(true);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [searchQuery, selectedTag],
  );

  // Trigger fresh load when filters change
  useEffect(() => {
    loadSeqRef.current += 1;
    const seq = loadSeqRef.current;

    setIsLoading(true);
    setRecipes([]);
    setAuthorMap({});
    setThumbnailMap({});
    setCursor(null);
    setHasMore(true);

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadPage(null, seq);
    }, DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [searchQuery, selectedTag, loadPage]);

  // Load next page
  const loadNextPage = useCallback(() => {
    if (isLoadingMore || !hasMore || !cursor) return;
    setIsLoadingMore(true);
    loadPage(cursor, loadSeqRef.current);
  }, [isLoadingMore, hasMore, cursor, loadPage]);

  // Pull-to-refresh (reload from first page)
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    loadSeqRef.current += 1;
    const seq = loadSeqRef.current;
    setRecipes([]);
    setAuthorMap({});
    setThumbnailMap({});
    setCursor(null);
    setHasMore(true);
    await loadPage(null, seq);
    setRefreshing(false);
  }, [loadPage]);

  // Navigation
  const navigateToRecipe = useCallback(
    (recipeId: string) => {
      router.push({ pathname: '/(public)/recipe/[id]', params: { id: recipeId } });
    },
    [router],
  );

  // Layout config per breakpoint
  const layoutConfig = getLayoutConfig(breakpoint);

  // Render item — on mobile, show inline ad after the 3rd result (per cookbook.pen)
  const renderItem = useCallback(
    ({ item, index }: { item: Recipe; index: number }) => {
      const thumb = thumbnailMap[item.id];
      const author = authorMap[item.id];
      const onPress = () => navigateToRecipe(item.id);

      if (breakpoint === 'mobile') {
        return (
          <>
            <PublicListRow
              recipe={item}
              thumbnailUrl={thumb}
              author={author}
              onPress={onPress}
            />
            {index === 2 && (
              <AdSlot
                variant="mobile"
                style={{ alignSelf: 'center', marginVertical: 8 }}
              />
            )}
          </>
        );
      }

      return (
        <PublicRecipeCard
          recipe={item}
          thumbnailUrl={thumb}
          author={author}
          onPress={onPress}
          isWeb={breakpoint === 'web'}
        />
      );
    },
    [breakpoint, thumbnailMap, authorMap, navigateToRecipe],
  );

  // List header
  const listHeader = useCallback(() => {
    if (breakpoint === 'web') {
      return (
        <WebChipsRow
          selectedTag={selectedTag}
          onTagChange={setSelectedTag}
          totalCount={totalCount}
        />
      );
    }

    // Mobile: ad is interleaved in renderItem; tablet: ad below list via footer
    return <CountSortRow totalCount={totalCount} />;
  }, [breakpoint, selectedTag, totalCount]);

  // List footer
  const listFooter = useCallback(() => {
    return (
      <View style={{ alignItems: 'center', gap: 16, paddingVertical: 16 }}>
        {/* Tablet/web: ad below results per cookbook.pen */}
        {breakpoint !== 'mobile' && recipes.length > 0 && (
          <AdSlot
            variant="leaderboard"
            style={{ alignSelf: 'center', marginBottom: 8 }}
          />
        )}
        {isLoadingMore && (
          <ActivityIndicator color={accentWarm} />
        )}
        {!isLoadingMore && !hasMore && recipes.length > 0 && (
          <Pressable
            onPress={() => router.push('/(public)/privacy')}
            accessibilityRole="link"
            accessibilityLabel="Privacy Policy"
          >
            <Text
              style={{
                fontFamily: fontFamilyBody,
                fontSize: 12,
                color: textTertiary,
                textDecorationLine: 'underline',
              }}
            >
              Privacy Policy
            </Text>
          </Pressable>
        )}
      </View>
    );
  }, [isLoadingMore, hasMore, recipes.length, router]);

  // Empty component
  const listEmpty = useCallback(() => {
    if (isLoading) return null;
    if (error) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text
            style={{
              fontSize: 15,
              fontFamily: fontFamilyBody,
              color: textSecondary,
            }}
          >
            Something went wrong
          </Text>
        </View>
      );
    }
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text
          style={{
            fontSize: 15,
            fontFamily: fontFamilyBody,
            color: textSecondary,
          }}
        >
          No recipes found
        </Text>
      </View>
    );
  }, [isLoading, error]);

  return (
    <View style={{ flex: 1, backgroundColor: bgPage }}>
      <PublicBrowseHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedTag={selectedTag}
        onTagChange={setSelectedTag}
      />

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={accentWarm} size="large" />
        </View>
      ) : (
        <FlatList
          data={recipes}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={layoutConfig.numColumns}
          key={layoutConfig.numColumns}
          columnWrapperStyle={
            layoutConfig.numColumns > 1 ? { gap: layoutConfig.gap } : undefined
          }
          contentContainerStyle={layoutConfig.contentContainerStyle}
          style={layoutConfig.listStyle}
          refreshControl={
            Platform.OS !== 'web'
              ? <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
              : undefined
          }
          onEndReached={loadNextPage}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
          ListEmptyComponent={listEmpty}
        />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Layout configuration per breakpoint
// ---------------------------------------------------------------------------

function getLayoutConfig(breakpoint: Breakpoint) {
  if (breakpoint === 'web') {
    return {
      numColumns: 4,
      gap: 20,
      contentContainerStyle: {
        paddingHorizontal: 48,
        paddingTop: 24,
        gap: 20,
        flexGrow: 1,
      },
      listStyle: { flexGrow: 1, flexBasis: 0 } as const,
    };
  }

  if (breakpoint === 'tablet') {
    return {
      numColumns: 2,
      gap: 16,
      contentContainerStyle: {
        paddingHorizontal: 32,
        paddingTop: 16,
        gap: 16,
      },
      listStyle: { flex: 1 } as const,
    };
  }

  // Mobile
  return {
    numColumns: 1,
    gap: 14,
    contentContainerStyle: {
      paddingHorizontal: 24,
      paddingTop: 12,
      gap: 14,
    },
    listStyle: { flex: 1 } as const,
  };
}

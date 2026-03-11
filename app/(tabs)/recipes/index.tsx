import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronRight, Folder, Search } from 'lucide-react-native';

import { useSession } from '@/features/auth/session';
import { searchRecipes, getAvailableTags, getAccessibleFamilies } from '@/features/recipes/search';
import { getRecipeThumbnailUrlMap } from '@/features/recipes/photos';
import type { Recipe, RecipeVisibility } from '@/features/recipes/types';
import { PageContainer } from '@/components/nav/PageContainer';
import { RecipeCard } from '@/components/recipes/RecipeCard';
import { getNumColumns } from '@/components/recipes/recipeCardUtils';
import { useBreakpoint } from '@/lib/hooks/useBreakpoint';
import {
  accentBlue,
  bgCard,
  bgPage,
  borderDefault,
  fontFamilyBody,
  fontFamilyBodyBold,
  fontFamilyBodyMedium,
  fontFamilyDisplay,
  fontSizeBase,
  fontSizeSm,
  fontSize2xl,
  radiusMd,
  radiusPill,
  textDisabled,
  textPrimary,
  textSecondary,
  white,
} from '@/lib/tokens';

export default function RecipesListScreen() {
  const { session } = useSession();
  const { breakpoint } = useBreakpoint();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [thumbnailByRecipeId, setThumbnailByRecipeId] = useState<Record<string, string>>({});
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedVisibility, setSelectedVisibility] = useState<RecipeVisibility | undefined>();
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null | undefined>();
  const [showFilters, setShowFilters] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [families, setFamilies] = useState<{ id: string; name: string }[]>([]);

  const loadSeqRef = useRef(0);
  const numColumns = getNumColumns(breakpoint);
  const isFiltered =
    searchQuery.trim().length > 0 ||
    selectedTags.length > 0 ||
    selectedVisibility !== undefined ||
    selectedFamilyId !== undefined;

  async function loadRecipes() {
    loadSeqRef.current += 1;
    const seq = loadSeqRef.current;
    try {
      const data = await searchRecipes({
        query: searchQuery,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        visibility: selectedVisibility,
        familyId: selectedFamilyId === undefined ? undefined : selectedFamilyId,
      });
      if (seq !== loadSeqRef.current) return;
      setRecipes(data);

      const recipeIds = data.map((r) => r.id);
      if (recipeIds.length > 0) {
        try {
          const map = await getRecipeThumbnailUrlMap(recipeIds, 300);
          if (seq === loadSeqRef.current) {
            setThumbnailByRecipeId(map);
          }
        } catch {
          if (seq === loadSeqRef.current) {
            setThumbnailByRecipeId({});
          }
        }
      } else {
        if (seq === loadSeqRef.current) {
          setThumbnailByRecipeId({});
        }
      }
    } catch (e) {
      console.warn('RecipesListScreen load error:', e);
    }
  }

  // Initial load + filter change re-query (show stale data while loading)
  useEffect(() => {
    void loadRecipes();
  }, [searchQuery, selectedTags, selectedVisibility, selectedFamilyId]);

  // Reload on screen focus
  useFocusEffect(
    useCallback(() => {
      void loadRecipes();
    }, [searchQuery, selectedTags, selectedVisibility, selectedFamilyId])
  );

  // Initial load flag (only block UI on first load, not on filter re-queries)
  useEffect(() => {
    async function initialLoad() {
      setIsLoading(true);
      await loadRecipes();
      setIsLoading(false);

      try {
        const [tagsData, familiesData] = await Promise.all([
          getAvailableTags(),
          getAccessibleFamilies(),
        ]);
        setAvailableTags(tagsData);
        setFamilies(familiesData);
      } catch (e) {
        console.warn('Failed to load filter options:', e);
      }
    }
    void initialLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearAllFilters() {
    setSearchQuery('');
    setSelectedTags([]);
    setSelectedVisibility(undefined);
    setSelectedFamilyId(undefined);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadRecipes();
    setRefreshing(false);
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  return (
    <PageContainer>
      {/* Header row: title + create button */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 24,
          paddingBottom: 16,
        }}
      >
        <Text
          style={{
            fontFamily: fontFamilyDisplay,
            fontSize: fontSize2xl,
            color: textPrimary,
          }}
        >
          My Recipes
        </Text>
        {session && (
          <Pressable
            onPress={() => router.push('/recipes/create')}
            style={{
              backgroundColor: accentBlue,
              borderRadius: radiusMd,
              paddingHorizontal: 16,
              paddingVertical: 10,
            }}
          >
            <Text
              style={{
                fontFamily: fontFamilyBodyMedium,
                fontSize: fontSizeBase,
                color: white,
              }}
            >
              + Create
            </Text>
          </Pressable>
        )}
      </View>

      {/* My Collections link — mobile entry point to collections (not in tab bar per cookbook.pen spec) */}
      <Pressable
        onPress={() => router.navigate('/collections' as any)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          gap: 8,
        }}
      >
        <Folder size={20} color={textSecondary} />
        <Text style={{ fontFamily: fontFamilyBody, fontSize: 15, color: textSecondary }}>
          My Collections
        </Text>
        <ChevronRight size={16} color={textDisabled} style={{ marginLeft: 'auto' }} />
      </Pressable>

      {/* Search bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: borderDefault,
          borderRadius: radiusMd,
          backgroundColor: bgCard,
          paddingHorizontal: 12,
          paddingVertical: 10,
          gap: 8,
          marginBottom: 12,
        }}
      >
        <Search size={18} color={textSecondary} />
        <TextInput
          style={{
            flex: 1,
            fontFamily: fontFamilyBody,
            fontSize: fontSizeBase,
            color: textPrimary,
          }}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search recipes..."
          placeholderTextColor={textSecondary}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Filter toggle */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
        <Pressable
          onPress={() => setShowFilters((v) => !v)}
          style={{
            borderWidth: 1,
            borderColor: borderDefault,
            borderRadius: radiusPill,
            backgroundColor: showFilters ? accentBlue : bgCard,
            paddingHorizontal: 14,
            paddingVertical: 6,
          }}
        >
          <Text
            style={{
              fontFamily: fontFamilyBodyMedium,
              fontSize: fontSizeSm,
              color: showFilters ? white : textSecondary,
            }}
          >
            {showFilters ? 'Hide Filters' : 'Filters'}
          </Text>
        </Pressable>
        {isFiltered && (
          <Pressable onPress={clearAllFilters}>
            <Text
              style={{
                fontFamily: fontFamilyBodyMedium,
                fontSize: fontSizeSm,
                color: accentBlue,
              }}
            >
              Clear all
            </Text>
          </Pressable>
        )}
      </View>

      {/* Collapsible filter area */}
      {showFilters && (
        <View
          style={{
            backgroundColor: bgCard,
            borderWidth: 1,
            borderColor: borderDefault,
            borderRadius: radiusMd,
            padding: 16,
            marginBottom: 16,
            gap: 12,
          }}
        >
          {/* Tag chips */}
          {availableTags.length > 0 && (
            <View>
              <Text
                style={{
                  fontFamily: fontFamilyBodyBold,
                  fontSize: fontSizeSm,
                  color: textSecondary,
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Tags
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {availableTags.map((tag) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <Pressable
                      key={tag}
                      onPress={() => toggleTag(tag)}
                      style={{
                        backgroundColor: active ? accentBlue : bgCard,
                        borderWidth: 1,
                        borderColor: active ? accentBlue : borderDefault,
                        borderRadius: radiusPill,
                        paddingHorizontal: 12,
                        paddingVertical: 5,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fontFamilyBodyMedium,
                          fontSize: fontSizeSm,
                          color: active ? white : textSecondary,
                        }}
                      >
                        {tag}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Visibility filter */}
          <View>
            <Text
              style={{
                fontFamily: fontFamilyBodyBold,
                fontSize: fontSizeSm,
                color: textSecondary,
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Visibility
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {([undefined, 'private', 'family', 'public'] as (RecipeVisibility | undefined)[]).map(
                (v) => {
                  const label = v === undefined ? 'All' : v.charAt(0).toUpperCase() + v.slice(1);
                  const active = selectedVisibility === v;
                  return (
                    <Pressable
                      key={label}
                      onPress={() => setSelectedVisibility(v)}
                      style={{
                        backgroundColor: active ? accentBlue : bgPage,
                        borderWidth: 1,
                        borderColor: active ? accentBlue : borderDefault,
                        borderRadius: radiusPill,
                        paddingHorizontal: 12,
                        paddingVertical: 5,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fontFamilyBodyMedium,
                          fontSize: fontSizeSm,
                          color: active ? white : textSecondary,
                        }}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                }
              )}
            </View>
          </View>

          {/* Family filter */}
          {families.length > 0 && (
            <View>
              <Text
                style={{
                  fontFamily: fontFamilyBodyBold,
                  fontSize: fontSizeSm,
                  color: textSecondary,
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Family
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[
                  { id: '__all__', name: 'All' },
                  { id: '__personal__', name: 'Personal' },
                  ...families,
                ].map(({ id, name }) => {
                  const value =
                    id === '__all__' ? undefined : id === '__personal__' ? null : id;
                  const active = selectedFamilyId === value;
                  return (
                    <Pressable
                      key={id}
                      onPress={() =>
                        setSelectedFamilyId(
                          id === '__all__' ? undefined : id === '__personal__' ? null : id
                        )
                      }
                      style={{
                        backgroundColor: active ? accentBlue : bgPage,
                        borderWidth: 1,
                        borderColor: active ? accentBlue : borderDefault,
                        borderRadius: radiusPill,
                        paddingHorizontal: 12,
                        paddingVertical: 5,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fontFamilyBodyMedium,
                          fontSize: fontSizeSm,
                          color: active ? white : textSecondary,
                        }}
                      >
                        {name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Content: loading / empty / grid */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={accentBlue} />
        </View>
      ) : recipes.length === 0 ? (
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingBottom: 80 }}
        >
          {isFiltered ? (
            <Text
              style={{
                fontFamily: fontFamilyBody,
                fontSize: fontSizeBase,
                color: textSecondary,
                textAlign: 'center',
              }}
            >
              No recipes found
            </Text>
          ) : (
            <>
              <Text
                style={{
                  fontFamily: fontFamilyBody,
                  fontSize: fontSizeBase,
                  color: textSecondary,
                  textAlign: 'center',
                }}
              >
                No recipes yet
              </Text>
              <Pressable
                onPress={() => router.push('/recipes/create')}
                style={{
                  backgroundColor: accentBlue,
                  borderRadius: radiusMd,
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                }}
              >
                <Text
                  style={{
                    fontFamily: fontFamilyBodyMedium,
                    fontSize: fontSizeBase,
                    color: white,
                  }}
                >
                  Create your first recipe
                </Text>
              </Pressable>
            </>
          )}
        </View>
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          key={numColumns}
          columnWrapperStyle={numColumns > 1 ? { gap: 16 } : undefined}
          contentContainerStyle={{
            paddingBottom: 40,
            gap: 16,
            flexGrow: 1,
          }}
          refreshControl={
            Platform.OS !== 'web'
              ? <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
              : undefined
          }
          renderItem={({ item }) => (
            <RecipeCard
              recipe={item}
              thumbnailUrl={thumbnailByRecipeId[item.id]}
              onPress={() => router.push(`/recipes/${item.id}`)}
              style={{ flex: 1 }}
            />
          )}
        />
      )}
    </PageContainer>
  );
}

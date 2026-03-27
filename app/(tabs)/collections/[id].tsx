import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  getCollectionById,
  getCollectionRecipes,
  addRecipeToCollection,
  removeRecipeFromCollection,
  deleteCollection,
} from '@/features/collections/api';
import { showAlert, confirmAction } from '@/lib/alert';
import type { Collection } from '@/features/collections/types';
import type { Recipe } from '@/features/recipes/types';
import { useSession } from '@/features/auth/session';
import { searchRecipes } from '@/features/recipes/search';
import { getRecipeThumbnailUrlMap } from '@/features/recipes/photos';
import { useBreakpoint } from '@/lib/hooks/useBreakpoint';
import { PageContainer } from '@/components/nav/PageContainer';
import { RecipeCard } from '@/components/recipes/RecipeCard';
import { getNumColumns } from '@/components/recipes/recipeCardUtils';
import {
  accentBlue,
  bgCard,
  borderDefault,
  fontFamilyBody,
  fontFamilyBodyMedium,
  fontFamilyDisplay,
  fontSize2xl,
  fontSizeBase,
  fontSizeSm,
  fontSizeXs,
  radiusMd,
  shadowSm,
  textPrimary,
  textSecondary,
  textTertiary,
  white,
} from '@/lib/tokens';

export default function CollectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const { breakpoint } = useBreakpoint();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [thumbnailMap, setThumbnailMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addQuery, setAddQuery] = useState('');
  const [candidateRecipes, setCandidateRecipes] = useState<Recipe[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingRecipeId, setIsAddingRecipeId] = useState<string | null>(null);

  const numColumns = getNumColumns(breakpoint);
  const isOwner = collection && session?.user.id === collection.owner_user_id;

  async function loadCollection() {
    if (!id) return;

    setIsLoading(true);
    setError(null);
    try {
      const [collectionData, recipesData] = await Promise.all([
        getCollectionById(id as string),
        getCollectionRecipes(id as string),
      ]);

      setCollection(collectionData);
      setRecipes(recipesData);

      // Batch thumbnail fetch
      const recipeIds = recipesData.map((r) => r.id);
      if (recipeIds.length > 0) {
        const urls = await getRecipeThumbnailUrlMap(recipeIds, 300);
        setThumbnailMap(urls);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load collection');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadCollection();
  }, [id]);

  // Search for recipes to add
  useEffect(() => {
    if (!isOwner) return;
    const q = addQuery.trim();
    if (!q) {
      setCandidateRecipes([]);
      return;
    }

    let cancelled = false;
    setIsSearching(true);

    const t = setTimeout(() => {
      (async () => {
        try {
          const results = await searchRecipes({ query: q });
          if (cancelled) return;
          const existing = new Set(recipes.map((r) => r.id));
          setCandidateRecipes(results.filter((r) => !existing.has(r.id)));
        } catch {
          if (!cancelled) setCandidateRecipes([]);
        } finally {
          if (!cancelled) setIsSearching(false);
        }
      })();
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [addQuery, isOwner, recipes]);

  async function handleRemoveRecipe(recipeId: string) {
    if (!collection) return;

    confirmAction('Remove Recipe', 'Remove this recipe from the collection?', async () => {
      try {
        await removeRecipeFromCollection(collection.id, recipeId);
        setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
      } catch {
        showAlert('Error', 'Failed to remove recipe from collection');
      }
    });
  }

  async function handleAddRecipe(recipe: Recipe) {
    if (!collection) return;
    setIsAddingRecipeId(recipe.id);
    try {
      await addRecipeToCollection(collection.id, recipe.id);
      setRecipes((prev) => [recipe, ...prev]);
      setCandidateRecipes((prev) => prev.filter((r) => r.id !== recipe.id));
      // Fetch thumbnail for the newly added recipe
      const urls = await getRecipeThumbnailUrlMap([recipe.id], 300);
      setThumbnailMap((prev) => ({ ...prev, ...urls }));
    } catch (e) {
      showAlert('Error', e instanceof Error ? e.message : 'Failed to add recipe to collection');
    } finally {
      setIsAddingRecipeId(null);
    }
  }

  async function handleDelete() {
    if (!collection) return;

    confirmAction(
      'Delete Collection',
      'Are you sure you want to delete this collection? Recipes will not be deleted.',
      async () => {
        try {
          await deleteCollection(collection.id);
          router.replace('/collections');
        } catch {
          showAlert('Error', 'Failed to delete collection');
        }
      },
    );
  }

  if (isLoading) {
    return (
      <PageContainer>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={accentBlue} />
        </View>
      </PageContainer>
    );
  }

  if (error || !collection) {
    return (
      <PageContainer>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text
            style={{
              fontFamily: fontFamilyBody,
              fontSize: fontSizeSm,
              color: '#d32f2f',
              textAlign: 'center',
            }}
          >
            {error || "Collection not found or you don't have access"}
          </Text>
        </View>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Header */}
      <View style={{ paddingVertical: 16 }}>
        {/* Back + Actions row */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <Pressable onPress={() => router.back()}>
            <Text
              style={{
                fontFamily: fontFamilyBody,
                fontSize: fontSizeBase,
                color: accentBlue,
              }}
            >
              Back
            </Text>
          </Pressable>

          {isOwner && (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                onPress={handleDelete}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: radiusMd,
                  borderWidth: 1,
                  borderColor: '#d32f2f',
                }}
              >
                <Text
                  style={{
                    fontFamily: fontFamilyBodyMedium,
                    fontSize: fontSizeSm,
                    color: '#d32f2f',
                  }}
                >
                  Delete
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Title + metadata */}
        <Text
          style={{
            fontFamily: fontFamilyDisplay,
            fontSize: fontSize2xl,
            color: textPrimary,
            marginBottom: 4,
          }}
        >
          {collection.name}
        </Text>
        {collection.description ? (
          <Text
            style={{
              fontFamily: fontFamilyBody,
              fontSize: fontSizeBase,
              color: textSecondary,
              marginBottom: 8,
            }}
          >
            {collection.description}
          </Text>
        ) : null}
        <Text
          style={{
            fontFamily: fontFamilyBody,
            fontSize: fontSizeXs,
            color: textTertiary,
          }}
        >
          {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'}
          {' \u00B7 '}
          {collection.family_id ? 'Family' : 'Personal'}
        </Text>
      </View>

      {/* Add recipes section (owner only) */}
      {isOwner && (
        <View
          style={{
            backgroundColor: bgCard,
            borderRadius: radiusMd,
            padding: 12,
            marginBottom: 16,
            ...shadowSm,
          }}
        >
          <Text
            style={{
              fontFamily: fontFamilyBodyMedium,
              fontSize: fontSizeSm,
              color: textPrimary,
              marginBottom: 8,
            }}
          >
            Add recipes
          </Text>
          <TextInput
            value={addQuery}
            onChangeText={setAddQuery}
            placeholder="Search recipes to add..."
            clearButtonMode="while-editing"
            autoCapitalize="none"
            style={{
              padding: 12,
              borderWidth: 1,
              borderColor: borderDefault,
              borderRadius: radiusMd,
              fontFamily: fontFamilyBody,
              fontSize: fontSizeBase,
              color: textPrimary,
              marginBottom: 8,
            }}
          />
          {isSearching ? (
            <ActivityIndicator size="small" color={accentBlue} />
          ) : candidateRecipes.length > 0 ? (
            <View style={{ maxHeight: 240 }}>
              {candidateRecipes.slice(0, 10).map((r) => (
                <View
                  key={r.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: borderDefault,
                  }}
                >
                  <Text
                    numberOfLines={1}
                    style={{
                      flex: 1,
                      marginRight: 12,
                      fontFamily: fontFamilyBody,
                      fontSize: fontSizeSm,
                      color: textPrimary,
                    }}
                  >
                    {r.title}
                  </Text>
                  <Pressable
                    onPress={() => handleAddRecipe(r)}
                    disabled={isAddingRecipeId === r.id}
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 12,
                      backgroundColor: accentBlue,
                      borderRadius: radiusMd,
                      opacity: isAddingRecipeId === r.id ? 0.5 : 1,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fontFamilyBodyMedium,
                        fontSize: fontSizeXs,
                        color: white,
                      }}
                    >
                      {isAddingRecipeId === r.id ? 'Adding...' : 'Add'}
                    </Text>
                  </Pressable>
                </View>
              ))}
              {candidateRecipes.length > 10 && (
                <Text
                  style={{
                    fontFamily: fontFamilyBody,
                    fontSize: fontSizeXs,
                    color: textTertiary,
                    paddingTop: 8,
                  }}
                >
                  Refine your search to see more results
                </Text>
              )}
            </View>
          ) : addQuery.trim() ? (
            <Text
              style={{
                fontFamily: fontFamilyBody,
                fontSize: fontSizeXs,
                color: textTertiary,
                paddingVertical: 8,
              }}
            >
              No matching recipes
            </Text>
          ) : null}
        </View>
      )}

      {/* Recipe grid or empty state */}
      {recipes.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text
            style={{
              fontFamily: fontFamilyBody,
              fontSize: fontSizeBase,
              color: textSecondary,
              textAlign: 'center',
              marginBottom: 16,
            }}
          >
            No recipes in this collection
          </Text>
          {isOwner && (
            <Text
              style={{
                fontFamily: fontFamilyBody,
                fontSize: fontSizeSm,
                color: textTertiary,
                textAlign: 'center',
              }}
            >
              Use the search above to add recipes
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={(item) => item.id}
          key={numColumns}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? { gap: 16 } : undefined}
          contentContainerStyle={{ gap: 16, paddingBottom: 32 }}
          style={breakpoint === 'web' ? { flexGrow: 1, flexBasis: 0 } : undefined}
          renderItem={({ item }) => (
            <View style={{ flex: numColumns > 1 ? 1 : undefined }}>
              <RecipeCard
                recipe={item}
                thumbnailUrl={thumbnailMap[item.id]}
                onPress={() => router.push(`/recipes/${item.id}`)}
              />
              {isOwner && (
                <Pressable
                  onPress={() => handleRemoveRecipe(item.id)}
                  style={{
                    alignSelf: 'flex-end',
                    marginTop: 6,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fontFamilyBody,
                      fontSize: fontSizeXs,
                      color: '#d32f2f',
                    }}
                  >
                    Remove
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        />
      )}
    </PageContainer>
  );
}

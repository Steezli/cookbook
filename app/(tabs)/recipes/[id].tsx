import { Link, router, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { 
  ActivityIndicator, 
  Alert, 
  Pressable, 
  ScrollView, 
  StyleSheet, 
  Text, 
  View 
} from "react-native";
import { Image, FlatList, Dimensions } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getRecipeById, deleteRecipe } from "@/features/recipes/api";
import type { Recipe } from "@/features/recipes/types";
import { useSession } from "@/features/auth/session";
import { getCollections, addRecipeToCollection, getRecipeCollections, removeRecipeFromCollection } from "@/features/collections/api";
import type { Collection, CollectionWithRecipeCount } from "@/features/collections/types";
import { getRecipePhotos, deleteRecipePhoto, getPhotoUrl, type RecipePhoto } from "@/features/recipes/photos";
import { CommentThread } from "@/features/comments/CommentThread";
import { displayAmount, canConvert } from "@/features/units/conversions";
import { getUnitPreference } from "@/features/units/api";
import type { UnitSystem } from "@/features/units/types";
import { StarRating } from "@/features/ratings/StarRating";
import { getUserRating, upsertRating } from "@/features/ratings/api";
import type { RatingAggregate } from "@/features/ratings/types";

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, isLoading: sessionLoading } = useSession();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [unitPreference, setUnitPreference] = useState<UnitSystem>('imperial');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collections, setCollections] = useState<CollectionWithRecipeCount[]>([]);
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [recipeCollections, setRecipeCollections] = useState<Collection[]>([]);
  const [isLoadingCollectionMembership, setIsLoadingCollectionMembership] = useState(false);
  const [photos, setPhotos] = useState<RecipePhoto[]>([]);
  const [userRating, setUserRating] = useState<number>(0);
  const [ratingAggregate, setRatingAggregate] = useState<RatingAggregate>({ average: null, count: 0 });

  async function loadRecipe() {
    if (!id) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await getRecipeById(id);
      setRecipe(data);
      
      // Load photos
      if (data) {
        const photoData = await getRecipePhotos(data.id);
        setPhotos(photoData);

        // Load rating aggregate from recipe data
        setRatingAggregate({
          average: data.rating_average,
          count: data.rating_count ?? 0
        });

        // Load user's rating if authenticated
        if (session?.user) {
          try {
            const userRatingData = await getUserRating(data.id);
            setUserRating(userRatingData?.rating ?? 0);
          } catch (e) {
            // User not authenticated or no rating - that's fine
            setUserRating(0);
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load recipe");
    } finally {
      setIsLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      void loadRecipe();
    }, [id])
  );

  useEffect(() => {
    async function loadCollections() {
      try {
        const data = await getCollections();
        setCollections(data);
      } catch (e) {
        // Silent fail - collection picker optional
      }
    }

    if (session) {
      void loadCollections();
    }
  }, [session]);

  useEffect(() => {
    async function loadPreference() {
      if (!session) return;

      try {
        const preference = await getUnitPreference();
        setUnitPreference(preference);
      } catch (e) {
        // Silent fail - use default imperial
      }
    }

    void loadPreference();
  }, [session]);

  function displayIngredient(ing: Recipe['ingredients'][0]): string {
    // If ingredient has canonical fields, try to display with conversion
    if (ing.amount !== undefined && ing.unit !== undefined && !ing.is_ambiguous) {
      const convertedText = displayAmount(
        ing.amount,
        ing.unit,
        unitPreference,
        ing.original_text || ing.text
      );

      // Extract ingredient name from original text (everything after amount and unit)
      const ingredientMatch = ing.text.match(/(?:\d+\.?\d*\s*(?:[a-z]+\s+)?)?(.+)$/i);
      const ingredientName = ingredientMatch ? ingredientMatch[1].trim() : ing.text;

      // If conversion happened, displayAmount includes the ingredient name already
      if (convertedText !== (ing.original_text || ing.text)) {
        return convertedText;
      }

      // No conversion needed or possible, return original
      return ing.text;
    }

    // If ambiguous, show with subtle indicator
    if (ing.is_ambiguous) {
      return `${ing.text} (approx.)`;
    }

    // Legacy ingredient or no canonical fields - show as-is
    return ing.text;
  }

  async function handleDelete() {
    if (!recipe) return;

    Alert.alert(
      "Delete Recipe",
      "Are you sure you want to delete this recipe? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteRecipe(recipe.id);
              router.back();
            } catch (e) {
              Alert.alert("Error", e instanceof Error ? e.message : "Failed to delete recipe");
            }
          }
        }
      ]
    );
  }

  const isOwner = !sessionLoading && recipe && session?.user.id === recipe.owner_user_id;
  const recipeCollectionIdSet = new Set(recipeCollections.map((c) => c.id));

  useEffect(() => {
    async function loadMembership() {
      if (!recipe || !isOwner) return;
      setIsLoadingCollectionMembership(true);
      try {
        const data = await getRecipeCollections(recipe.id);
        setRecipeCollections(data);
      } catch {
        // Silent fail - membership UI is non-critical enhancement
      } finally {
        setIsLoadingCollectionMembership(false);
      }
    }

    void loadMembership();
  }, [recipe?.id, isOwner]);

  async function handleRatingChange(newRating: number) {
    if (!recipe || !session?.user) return;

    try {
      await upsertRating(recipe.id, newRating);
      setUserRating(newRating);

      // Refetch recipe to get updated aggregates after trigger fires
      setTimeout(async () => {
        try {
          const updatedRecipe = await getRecipeById(recipe.id);
          if (updatedRecipe) {
            setRatingAggregate({
              average: updatedRecipe.rating_average,
              count: updatedRecipe.rating_count ?? 0
            });
          }
        } catch (e) {
          // Silent fail - aggregate will update on next page load
        }
      }, 500);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to submit rating");
    }
  }

  async function toggleCollectionMembership(collection: CollectionWithRecipeCount) {
    if (!recipe) return;

    const alreadyIn = recipeCollectionIdSet.has(collection.id);
    try {
      if (alreadyIn) {
        await removeRecipeFromCollection(collection.id, recipe.id);
        setRecipeCollections((prev) => prev.filter((c) => c.id !== collection.id));
      } else {
        await addRecipeToCollection(collection.id, recipe.id);
        // We only need id+name for display; keep the returned list lightweight.
        setRecipeCollections((prev) => [
          ...prev,
          {
            id: collection.id,
            owner_user_id: session!.user.id,
            family_id: collection.family_id,
            name: collection.name,
            description: collection.description ?? null,
            created_at: collection.created_at,
            updated_at: collection.updated_at
          }
        ]);
      }
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to update collection membership");
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: recipe?.title || "Recipe" }} />
      <View style={styles.container}>
        {isLoading ? (
          <ActivityIndicator />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : !recipe ? (
          <Text style={styles.error}>Recipe not found or you don't have access</Text>
        ) : (
          <ScrollView>
            <Text style={styles.title}>{recipe.title}</Text>
            <Text style={styles.meta}>
              {recipe.visibility} • Created {new Date(recipe.created_at).toLocaleDateString()}
            </Text>

            {recipe.description && (
              <Text style={styles.description}>{recipe.description}</Text>
            )}

            {recipe.tags.length > 0 && (
              <View style={styles.tagContainer}>
                {recipe.tags.map((tag, i) => (
                  <Text key={i} style={styles.tag}>{tag}</Text>
                ))}
              </View>
            )}

            <View style={styles.metadataRow}>
              {recipe.servings && <Text>Servings: {recipe.servings}</Text>}
              {recipe.prep_time_minutes && <Text>Prep: {recipe.prep_time_minutes}m</Text>}
              {recipe.cook_time_minutes && <Text>Cook: {recipe.cook_time_minutes}m</Text>}
            </View>

            {/* Rating Section */}
            <View style={styles.ratingSection}>
              {/* Average Rating Display */}
              <View style={styles.averageRatingRow}>
                <Text style={styles.ratingLabel}>Rating:</Text>
                <StarRating
                  value={ratingAggregate.average ?? 0}
                  size={20}
                />
                <Text style={styles.ratingCount}>
                  {ratingAggregate.count > 0
                    ? `${ratingAggregate.average?.toFixed(1) ?? '0.0'} (${ratingAggregate.count} ${ratingAggregate.count === 1 ? 'rating' : 'ratings'})`
                    : 'No ratings yet'}
                </Text>
              </View>

              {/* User Rating (Interactive) */}
              {session?.user && (
                <View style={styles.userRatingRow}>
                  <Text style={styles.ratingLabel}>Your rating:</Text>
                  <StarRating
                    value={userRating}
                    onChange={handleRatingChange}
                    size={36}
                  />
                  {userRating > 0 && (
                    <Text style={styles.userRatingValue}>{userRating.toFixed(1)}</Text>
                  )}
                </View>
              )}
            </View>

            {photos.length > 0 && (
              <FlatList
                horizontal
                data={photos}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.photoContainer}>
                    <Image
                      source={{ uri: getPhotoUrl(item.storage_path) }}
                      style={styles.photo}
                      resizeMode="contain"
                    />
                    {isOwner && (
                      <Pressable
                        style={styles.photoDeleteButton}
                        onPress={async () => {
                          try {
                            await deleteRecipePhoto(item.id);
                            setPhotos(photos.filter(p => p.id !== item.id));
                          } catch (e) {
                            Alert.alert("Error", "Failed to delete photo");
                          }
                        }}
                      >
                        <Text style={styles.photoDeleteButtonText}>✕</Text>
                      </Pressable>
                    )}
                  </View>
                )}
                showsHorizontalScrollIndicator={false}
                style={styles.photoGallery}
              />
            )}

            <Text style={styles.sectionTitle}>Ingredients</Text>
            {recipe.ingredients.map((ing, i) => (
              <Text key={i} style={styles.listItem}>• {displayIngredient(ing)}</Text>
            ))}

            <Text style={styles.sectionTitle}>Steps</Text>
            {recipe.steps.map((step, i) => (
              <View key={i} style={styles.stepItem}>
                <Text style={styles.stepNumber}>{i + 1}.</Text>
                <Text style={styles.stepText}>{step.text}</Text>
              </View>
            ))}

            {recipe.source_story && (
              <>
                <Text style={styles.sectionTitle}>Story</Text>
                <Text style={styles.story}>{recipe.source_story}</Text>
              </>
            )}

            {!sessionLoading && session ? (
              <>
                <Text style={styles.sectionTitle}>Comments</Text>
                <CommentThread
                  recipeId={recipe.id}
                  recipeOwnerId={recipe.owner_user_id}
                  recipeFamilyId={recipe.family_id}
                />
              </>
            ) : !sessionLoading ? (
              <>
                <Text style={styles.sectionTitle}>Comments</Text>
                <Text style={styles.loginPrompt}>Log in to view and post comments.</Text>
              </>
            ) : null}

            {isOwner && collections.length > 0 && (
              <>
                <Pressable
                  style={styles.addToCollectionButton}
                  onPress={() => setShowCollectionPicker(!showCollectionPicker)}
                >
                  <Text style={styles.addToCollectionButtonText}>
                    {showCollectionPicker ? "Hide Collections" : "Collections"}
                  </Text>
                </Pressable>

                <Text style={styles.collectionMembershipHint}>
                  {recipeCollections.length > 0
                    ? `In: ${recipeCollections.map((c) => c.name).sort().join(", ")}`
                    : "Not in any collections yet"}
                </Text>

                {showCollectionPicker && (
                  <View style={styles.collectionPicker}>
                    {isLoadingCollectionMembership && (
                      <View style={styles.collectionMembershipLoading}>
                        <ActivityIndicator />
                      </View>
                    )}
                    {collections.map((collection) => {
                      const added = recipeCollectionIdSet.has(collection.id);
                      return (
                        <View key={collection.id} style={styles.collectionRow}>
                          <Text style={styles.collectionPickerItemText}>{collection.name}</Text>
                          <Pressable
                            style={[
                              styles.collectionActionButton,
                              added ? styles.collectionActionRemove : styles.collectionActionAdd
                            ]}
                            onPress={() => toggleCollectionMembership(collection)}
                          >
                            <Text
                              style={[
                                styles.collectionActionText,
                                added ? styles.collectionActionTextRemove : styles.collectionActionTextAdd
                              ]}
                            >
                              {added ? "Remove" : "Add"}
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                )}
              </>
            )}

            {!sessionLoading ? (
              isOwner && (
                <View style={styles.actions}>
                  <Link href={`/recipes/${recipe.id}/edit`} asChild>
                    <Pressable style={styles.editButton}>
                      <Text style={styles.editButtonText}>Edit Recipe</Text>
                    </Pressable>
                  </Link>
                  <Pressable style={styles.deleteButton} onPress={handleDelete}>
                    <Text style={styles.deleteButtonText}>Delete Recipe</Text>
                  </Pressable>
                </View>
              )
            ) : (
              <View style={styles.actions}>
                <View style={[styles.editButton, styles.disabledButton]}>
                  <Text style={styles.editButtonText}>Loading...</Text>
                </View>
                <View style={[styles.deleteButton, styles.disabledButton]}>
                  <Text style={styles.deleteButtonText}>Loading...</Text>
                </View>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
    color: "#333",
  },
  meta: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
    color: "#333",
  },
  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  tag: {
    backgroundColor: "#007AFF",
    color: "white",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
    fontSize: 12,
  },
  metadataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    backgroundColor: "white",
    padding: 12,
    borderRadius: 8,
  },
  ratingSection: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  averageRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  userRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginRight: 12,
    minWidth: 80,
  },
  ratingCount: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  userRatingValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFD700",
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 24,
    marginBottom: 12,
    color: "#333",
  },
  listItem: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
    color: "#333",
  },
  stepItem: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "flex-start",
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: "600",
    marginRight: 12,
    color: "#007AFF",
    minWidth: 24,
  },
  stepText: {
    fontSize: 16,
    lineHeight: 24,
    flex: 1,
    color: "#333",
  },
  story: {
    fontSize: 16,
    lineHeight: 24,
    fontStyle: "italic",
    color: "#666",
  },
  actions: {
    marginTop: 32,
    flexDirection: "row",
    gap: 12,
  },
  editButton: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
  },
  editButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  deleteButton: {
    backgroundColor: "#FF3B30",
    padding: 16,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },
  addToCollectionButton: {
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 8
  },
  addToCollectionButtonText: {
    fontSize: 14,
    color: "#333"
  },
  collectionMembershipHint: {
    fontSize: 12,
    color: "#666",
    marginBottom: 12,
    textAlign: "center"
  },
  collectionMembershipLoading: {
    paddingVertical: 8
  },
  collectionPicker: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  collectionPickerItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0"
  },
  collectionPickerItemText: {
    fontSize: 14
  },
  collectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0"
  },
  collectionActionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1
  },
  collectionActionAdd: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF"
  },
  collectionActionRemove: {
    backgroundColor: "#fff",
    borderColor: "#d32f2f"
  },
  collectionActionText: {
    fontSize: 12,
    fontWeight: "600"
  },
  collectionActionTextAdd: {
    color: "#fff"
  },
  collectionActionTextRemove: {
    color: "#d32f2f"
  },
  error: {
    color: "red",
    textAlign: "center",
    marginTop: 20,
  },
  loginPrompt: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
    marginVertical: 8,
  },
  photoGallery: {
    marginVertical: 16
  },
  photoContainer: {
    width: Dimensions.get("window").width * 0.7,
    height: 250,
    marginRight: 12,
    position: "relative",
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    overflow: "hidden"
  },
  photo: {
    width: "100%",
    height: "100%",
    borderRadius: 12
  },
  photoDeleteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center"
  },
  photoDeleteButtonText: {
    color: "#fff",
    fontSize: 18
  },
});

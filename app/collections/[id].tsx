import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { 
  ActivityIndicator, 
  Alert, 
  FlatList, 
  Pressable, 
  StyleSheet, 
  Text, 
  TextInput,
  View 
} from "react-native";
import { 
  getCollectionById, 
  getCollectionRecipes,
  addRecipeToCollection,
  removeRecipeFromCollection,
  deleteCollection
} from "@/features/collections/api";
import type { Collection } from "@/features/collections/types";
import type { Recipe } from "@/features/recipes/types";
import { useSession } from "@/features/auth/session";
import { searchRecipes } from "@/features/recipes/search";

export default function CollectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addQuery, setAddQuery] = useState("");
  const [candidateRecipes, setCandidateRecipes] = useState<Recipe[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingRecipeId, setIsAddingRecipeId] = useState<string | null>(null);

  async function loadCollection() {
    if (!id) return;

    setIsLoading(true);
    setError(null);
    try {
      const [collectionData, recipesData] = await Promise.all([
        getCollectionById(id as string),
        getCollectionRecipes(id as string)
      ]);
      
      setCollection(collectionData);
      setRecipes(recipesData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load collection");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadCollection();
  }, [id]);

  const isOwner = collection && session?.user.id === collection.owner_user_id;

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

    try {
      await removeRecipeFromCollection(collection.id, recipeId);
      setRecipes(recipes.filter(r => r.id !== recipeId));
    } catch (e) {
      Alert.alert("Error", "Failed to remove recipe from collection");
    }
  }

  async function handleAddRecipe(recipe: Recipe) {
    if (!collection) return;
    setIsAddingRecipeId(recipe.id);
    try {
      await addRecipeToCollection(collection.id, recipe.id);
      setRecipes((prev) => [recipe, ...prev]);
      setCandidateRecipes((prev) => prev.filter((r) => r.id !== recipe.id));
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to add recipe to collection");
    } finally {
      setIsAddingRecipeId(null);
    }
  }

  async function handleDelete() {
    if (!collection) return;

    Alert.alert(
      "Delete Collection",
      "Are you sure you want to delete this collection? Recipes will not be deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCollection(collection.id);
              router.replace("/collections" as any);
            } catch (e) {
              Alert.alert("Error", "Failed to delete collection");
            }
          }
        }
      ]
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: collection?.name || "Collection" }} />
      <View style={styles.container}>
        {isLoading ? (
          <ActivityIndicator />
        ) : error || !collection ? (
          <Text style={styles.error}>
            {error || "Collection not found or you don't have access"}
          </Text>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>{collection.name}</Text>
              {collection.description && (
                <Text style={styles.description}>{collection.description}</Text>
              )}
              <Text style={styles.meta}>
                {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"}
                {" • "}
                {collection.family_id ? "Family" : "Personal"}
              </Text>
            </View>

            {isOwner && (
              <View style={styles.addSection}>
                <Text style={styles.addSectionTitle}>Add recipes</Text>
                <TextInput
                  style={styles.addSearchInput}
                  value={addQuery}
                  onChangeText={setAddQuery}
                  placeholder="Search recipes to add..."
                  clearButtonMode="while-editing"
                  autoCapitalize="none"
                />
                {isSearching ? (
                  <ActivityIndicator />
                ) : candidateRecipes.length > 0 ? (
                  <View style={styles.candidateList}>
                    {candidateRecipes.slice(0, 10).map((r) => (
                      <View key={r.id} style={styles.candidateRow}>
                        <Text style={styles.candidateTitle} numberOfLines={1}>
                          {r.title}
                        </Text>
                        <Pressable
                          style={styles.candidateAddButton}
                          onPress={() => handleAddRecipe(r)}
                          disabled={isAddingRecipeId === r.id}
                        >
                          <Text style={styles.candidateAddButtonText}>
                            {isAddingRecipeId === r.id ? "Adding…" : "Add"}
                          </Text>
                        </Pressable>
                      </View>
                    ))}
                    {candidateRecipes.length > 10 && (
                      <Text style={styles.candidateMoreHint}>
                        Refine your search to see more results
                      </Text>
                    )}
                  </View>
                ) : addQuery.trim() ? (
                  <Text style={styles.candidateEmpty}>No matching recipes</Text>
                ) : null}
              </View>
            )}

            {recipes.length === 0 ? (
              <Text style={styles.empty}>
                No recipes in this collection yet. Add some above.
              </Text>
            ) : (
              <FlatList
                data={recipes}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.recipeCard}>
                    <Pressable
                      style={styles.recipeCardContent}
                      onPress={() => router.push(`/recipes/${item.id}` as any)}
                    >
                      <Text style={styles.recipeTitle}>{item.title}</Text>
                      <Text style={styles.recipeMeta}>
                        {item.ingredients.length} ingredients • {item.steps.length} steps
                      </Text>
                    </Pressable>
                    {isOwner && (
                      <Pressable
                        style={styles.removeButton}
                        onPress={() => handleRemoveRecipe(item.id)}
                      >
                        <Text style={styles.removeButtonText}>Remove</Text>
                      </Pressable>
                    )}
                  </View>
                )}
              />
            )}

            {isOwner && (
              <Pressable style={styles.deleteButton} onPress={handleDelete}>
                <Text style={styles.deleteButtonText}>Delete Collection</Text>
              </Pressable>
            )}
          </>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16
  },
  header: {
    marginBottom: 16
  },
  addSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2
  },
  addSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8
  },
  addSearchInput: {
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 8
  },
  candidateList: {
    maxHeight: 240
  },
  candidateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0"
  },
  candidateTitle: {
    flex: 1,
    marginRight: 12,
    fontSize: 14
  },
  candidateAddButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#007AFF",
    borderRadius: 8
  },
  candidateAddButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700"
  },
  candidateEmpty: {
    fontSize: 12,
    color: "#666",
    paddingVertical: 8
  },
  candidateMoreHint: {
    fontSize: 12,
    color: "#666",
    paddingTop: 8
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8
  },
  description: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8
  },
  meta: {
    fontSize: 12,
    color: "#999"
  },
  empty: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 32
  },
  error: {
    fontSize: 14,
    color: "#d32f2f",
    textAlign: "center",
    marginTop: 32
  },
  recipeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  recipeCardContent: {
    flex: 1
  },
  recipeTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4
  },
  recipeMeta: {
    fontSize: 12,
    color: "#999"
  },
  removeButton: {
    padding: 8,
    backgroundColor: "#f5f5f5",
    borderRadius: 6
  },
  removeButtonText: {
    fontSize: 12,
    color: "#d32f2f"
  },
  deleteButton: {
    padding: 16,
    backgroundColor: "#d32f2f",
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  }
});
import { Link, router, Stack } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, TextInput, Image } from "react-native";
import { searchRecipes, getAvailableTags, getAccessibleFamilies } from "@/features/recipes/search";
import type { Recipe, RecipeVisibility } from "@/features/recipes/types";
import { useSession } from "@/features/auth/session";
import { getRecipeThumbnailUrlMap } from "@/features/recipes/photos";

export default function RecipesListScreen() {
  const { session } = useSession();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedVisibility, setSelectedVisibility] = useState<RecipeVisibility | undefined>();
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null | undefined>();
  const [showFilters, setShowFilters] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [families, setFamilies] = useState<{ id: string; name: string }[]>([]);
  const [thumbnailByRecipeId, setThumbnailByRecipeId] = useState<Record<string, string>>({});
  const loadSeqRef = useRef(0);

  async function loadRecipes() {
    setIsLoading(true);
    setError(null);
    loadSeqRef.current += 1;
    const seq = loadSeqRef.current;
    try {
      const data = await searchRecipes({
        query: searchQuery,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        visibility: selectedVisibility,
        familyId: selectedFamilyId === undefined ? undefined : selectedFamilyId
      });
      setRecipes(data);

      // Fetch thumbnails in one additional query (no per-recipe fetch)
      try {
        const recipeIds = data.map((r) => r.id);
        const map = await getRecipeThumbnailUrlMap(recipeIds, 144);
        if (seq === loadSeqRef.current) {
          setThumbnailByRecipeId(map);
        }
      } catch {
        // Thumbnails are a progressive enhancement; do not block list.
        if (seq === loadSeqRef.current) {
          setThumbnailByRecipeId({});
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load recipes");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadRecipes();
  }, []);

  useEffect(() => {
    async function loadFilters() {
      try {
        const [tagsData, familiesData] = await Promise.all([
          getAvailableTags(),
          getAccessibleFamilies()
        ]);
        setAvailableTags(tagsData);
        setFamilies(familiesData);
      } catch (e) {
        console.error("Failed to load filters:", e);
      }
    }

    void loadFilters();
  }, []);

  useEffect(() => {
    void loadRecipes();
  }, [searchQuery, selectedTags, selectedVisibility, selectedFamilyId]);

  return (
    <>
      <Stack.Screen options={{ title: "Recipes" }} />
      <View style={styles.container}>
        {session && (
          <Pressable
            style={styles.createButton}
            onPress={() => router.push("/recipes/create")}
          >
            <Text style={styles.createButtonText}>+ Create Recipe</Text>
          </Pressable>
        )}

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search recipes..."
            clearButtonMode="while-editing"
          />
          <Pressable
            style={styles.filterToggle}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Text style={styles.filterToggleText}>
              {showFilters ? "Hide Filters" : "Show Filters"}
            </Text>
          </Pressable>
        </View>

        {showFilters && (
          <View style={styles.filtersContainer}>
            {/* Tag filter */}
            <Text style={styles.filterLabel}>Tags</Text>
            <View style={styles.tagContainer}>
              {availableTags.map((tag) => (
                <Pressable
                  key={tag}
                  style={[
                    styles.tagChip,
                    selectedTags.includes(tag) && styles.tagChipSelected
                  ]}
                  onPress={() => {
                    if (selectedTags.includes(tag)) {
                      setSelectedTags(selectedTags.filter(t => t !== tag));
                    } else {
                      setSelectedTags([...selectedTags, tag]);
                    }
                  }}
                >
                  <Text style={[
                    styles.tagChipText,
                    selectedTags.includes(tag) && styles.tagChipTextSelected
                  ]}>
                    {tag}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Visibility filter */}
            <Text style={styles.filterLabel}>Visibility</Text>
            <View style={styles.visibilityContainer}>
              <Pressable
                style={[
                  styles.visibilityButton,
                  selectedVisibility === undefined && styles.visibilityButtonSelected
                ]}
                onPress={() => setSelectedVisibility(undefined)}
              >
                <Text>All</Text>
              </Pressable>
              {(["private", "family", "public"] as RecipeVisibility[]).map((v) => (
                <Pressable
                  key={v}
                  style={[
                    styles.visibilityButton,
                    selectedVisibility === v && styles.visibilityButtonSelected
                  ]}
                  onPress={() => setSelectedVisibility(v)}
                >
                  <Text>{v}</Text>
                </Pressable>
              ))}
            </View>

            {/* Family filter */}
            {families.length > 0 && (
              <>
                <Text style={styles.filterLabel}>Family</Text>
                <View style={styles.familyContainer}>
                  <Pressable
                    style={[
                      styles.familyButton,
                      selectedFamilyId === undefined && styles.familyButtonSelected
                    ]}
                    onPress={() => setSelectedFamilyId(undefined)}
                  >
                    <Text>All</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.familyButton,
                      selectedFamilyId === null && styles.familyButtonSelected
                    ]}
                    onPress={() => setSelectedFamilyId(null)}
                  >
                    <Text>Personal</Text>
                  </Pressable>
                  {families.map((family) => (
                    <Pressable
                      key={family.id}
                      style={[
                        styles.familyButton,
                        selectedFamilyId === family.id && styles.familyButtonSelected
                      ]}
                      onPress={() => setSelectedFamilyId(family.id)}
                    >
                      <Text>{family.name}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {/* Clear filters */}
            <Pressable
              style={styles.clearFiltersButton}
              onPress={() => {
                setSearchQuery("");
                setSelectedTags([]);
                setSelectedVisibility(undefined);
                setSelectedFamilyId(undefined);
              }}
            >
              <Text style={styles.clearFiltersButtonText}>Clear All Filters</Text>
            </Pressable>
          </View>
        )}

        {isLoading ? (
          <ActivityIndicator />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : recipes.length === 0 ? (
          <Text style={styles.empty}>
            {searchQuery || selectedTags.length > 0 || selectedVisibility || selectedFamilyId !== undefined
              ? "No recipes match your filters. Try adjusting your search."
              : "No recipes yet. Create your first recipe!"}
          </Text>
        ) : (
          <FlatList
            data={recipes}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                style={styles.recipeCard}
                onPress={() => router.push(`/recipes/${item.id}`)}
              >
                {thumbnailByRecipeId[item.id] ? (
                  <Image
                    source={{ uri: thumbnailByRecipeId[item.id] }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.thumbnailPlaceholder} />
                )}
                <View style={styles.recipeCardText}>
                  <Text style={styles.recipeTitle}>{item.title}</Text>
                  <Text style={styles.recipeMeta}>
                    {item.visibility} • {item.ingredients.length} ingredients • {item.steps.length} steps
                  </Text>
                  {item.tags.length > 0 && (
                    <Text style={styles.recipeTags}>{item.tags.join(", ")}</Text>
                  )}
                </View>
              </Pressable>
            )}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  createButton: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  createButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  searchContainer: {
    gap: 8,
    marginBottom: 16
  },
  searchInput: {
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    fontSize: 16
  },
  filterToggle: {
    padding: 12,
    backgroundColor: "#e8e8e8",
    borderRadius: 8,
    alignItems: "center"
  },
  filterToggleText: {
    fontSize: 14,
    color: "#333"
  },
  filtersContainer: {
    padding: 16,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    marginBottom: 16
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 8
  },
  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  tagChip: {
    padding: 8,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ddd"
  },
  tagChipSelected: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF"
  },
  tagChipText: {
    fontSize: 12,
    color: "#333"
  },
  tagChipTextSelected: {
    color: "#fff"
  },
  visibilityContainer: {
    flexDirection: "row",
    gap: 8
  },
  visibilityButton: {
    flex: 1,
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd"
  },
  visibilityButtonSelected: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF"
  },
  familyContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  familyButton: {
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd"
  },
  familyButtonSelected: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF"
  },
  clearFiltersButton: {
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#ddd"
  },
  clearFiltersButtonText: {
    fontSize: 14,
    color: "#d32f2f"
  },
  recipeCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: "#eee"
  },
  thumbnailPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: "#eee"
  },
  recipeCardText: {
    flex: 1
  },
  recipeTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  recipeMeta: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  recipeTags: {
    fontSize: 12,
    color: "#007AFF",
    fontStyle: "italic",
  },
  error: {
    color: "red",
    textAlign: "center",
    marginTop: 20,
  },
  empty: {
    color: "#666",
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
  },
});
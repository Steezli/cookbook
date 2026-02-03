import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { supabase } from "@/lib/supabase";

type Recipe = {
  id: string;
  title: string | null;
  visibility: "private" | "family" | "public";
  owner_user_id: string;
  family_id: string | null;
};

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipeId = typeof id === "string" ? id : null;

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!recipeId) {
        setError("Missing recipe id.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      setRecipe(null);

      const { data, error: fetchError } = await supabase
        .from("recipes")
        .select("id,title,visibility,owner_user_id,family_id")
        .eq("id", recipeId)
        .maybeSingle();

      if (fetchError) {
        setError(fetchError.message);
      } else if (!data) {
        // Important Phase 1 semantic: unauthorized-by-design is rendered as "Not found"
        // because RLS returns zero rows.
        setRecipe(null);
      } else {
        setRecipe(data as Recipe);
      }

      setIsLoading(false);
    }

    void load();
  }, [recipeId]);

  return (
    <>
      <Stack.Screen options={{ title: "Recipe" }} />
      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.meta}>Loading…</Text>
          </View>
        ) : error ? (
          <>
            <Text style={styles.title}>Error</Text>
            <Text style={styles.note}>{error}</Text>
          </>
        ) : recipe ? (
          <>
            <Text style={styles.title}>{recipe.title ?? "Untitled recipe"}</Text>
            <Text style={styles.meta}>visibility: {recipe.visibility}</Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>Not found</Text>
            <Text style={styles.note}>
              This recipe doesn’t exist, or you don’t have access.
            </Text>
          </>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 12
  },
  loading: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center"
  },
  title: {
    fontSize: 24,
    fontWeight: "700"
  },
  meta: {
    fontSize: 14,
    opacity: 0.7
  },
  note: {
    fontSize: 14,
    lineHeight: 20
  }
});

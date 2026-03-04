import { Link, router, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { getCollections } from "@/features/collections/api";
import type { CollectionWithRecipeCount } from "@/features/collections/types";
import { useSession } from "@/features/auth/session";

export default function CollectionsListScreen() {
  const { session } = useSession();
  const [collections, setCollections] = useState<CollectionWithRecipeCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadCollections() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCollections();
      setCollections(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load collections");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadCollections();
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: "Collections" }} />
      <View style={styles.container}>
        {session && (
          <Pressable
            style={styles.createButton}
            onPress={() => router.push("/collections/create" as any)}
          >
            <Text style={styles.createButtonText}>+ Create Collection</Text>
          </Pressable>
        )}

        {isLoading ? (
          <ActivityIndicator />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : collections.length === 0 ? (
          <Text style={styles.empty}>
            No collections yet. Create a collection to organize your recipes!
          </Text>
        ) : (
          <FlatList
            data={collections}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                style={styles.collectionCard}
                onPress={() => router.push(`/collections/${item.id}` as any)}
              >
                <Text style={styles.collectionName}>{item.name}</Text>
                {item.description && (
                  <Text style={styles.collectionDescription}>{item.description}</Text>
                )}
                <Text style={styles.collectionMeta}>
                  {item.recipe_count} {item.recipe_count === 1 ? "recipe" : "recipes"}
                  {" • "}
                  {item.family_id ? "Family" : "Personal"}
                </Text>
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
    padding: 16
  },
  createButton: {
    padding: 16,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  },
  collectionCard: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  collectionName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4
  },
  collectionDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8
  },
  collectionMeta: {
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
  }
});
import { router, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { 
  Alert, 
  Pressable, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TextInput, 
  View 
} from "react-native";
import { createCollection } from "@/features/collections/api";
import { supabase } from "@/lib/supabase";

type Family = {
  id: string;
  name: string;
};

export default function CreateCollectionScreen() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [families, setFamilies] = useState<Family[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadFamilies() {
      const { data, error } = await supabase
        .from("families")
        .select("id, name")
        .order("name");
      
      if (!error && data) {
        setFamilies(data);
      }
    }

    void loadFamilies();
  }, []);

  async function handleSubmit() {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Collection name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const collection = await createCollection({
        name: name.trim(),
        description: description.trim() || undefined,
        family_id: familyId
      });
      
      router.replace(`/collections/${collection.id}` as any);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to create collection");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: "Create Collection" }} />
      <ScrollView style={styles.container}>
        <Text style={styles.label}>Name *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g., Holiday Favorites"
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Brief description"
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Type</Text>
        <View style={styles.radioGroup}>
          <Pressable
            style={styles.radioButton}
            onPress={() => setFamilyId(null)}
          >
            <View style={[
              styles.radioCircle,
              familyId === null && styles.radioCircleSelected
            ]} />
            <Text>Personal (only you)</Text>
          </Pressable>
          
          {families.map((family) => (
            <Pressable
              key={family.id}
              style={styles.radioButton}
              onPress={() => setFamilyId(family.id)}
            >
              <View style={[
                styles.radioCircle,
                familyId === family.id && styles.radioCircleSelected
              ]} />
              <Text>Family: {family.name}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? "Creating..." : "Create Collection"}
          </Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 16
  },
  input: {
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    fontSize: 16
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top"
  },
  radioGroup: {
    gap: 12
  },
  radioButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 8
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#ccc"
  },
  radioCircleSelected: {
    borderColor: "#007AFF",
    backgroundColor: "#007AFF"
  },
  submitButton: {
    padding: 16,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    alignItems: "center",
    marginTop: 32,
    marginBottom: 32
  },
  submitButtonDisabled: {
    opacity: 0.5
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  }
});
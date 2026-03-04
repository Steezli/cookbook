import { Stack, router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useSession } from "@/features/auth/session";
import { getUnitPreference, setUnitPreference } from "@/features/units/api";
import type { UnitSystem } from "@/features/units/types";

export default function SettingsScreen() {
  const { session, isLoading: sessionLoading } = useSession();
  const [unitPreference, setUnitPreferenceState] = useState<UnitSystem>('imperial');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadPreference() {
      if (!session) return;

      try {
        const preference = await getUnitPreference();
        setUnitPreferenceState(preference);
      } catch (e) {
        console.error("Failed to load unit preference:", e);
        // Silent fail - use default
      } finally {
        setIsLoading(false);
      }
    }

    void loadPreference();
  }, [session]);

  async function handlePreferenceChange(preference: UnitSystem) {
    if (isSaving) return;

    // Update local state immediately for responsiveness
    setUnitPreferenceState(preference);
    setIsSaving(true);

    try {
      await setUnitPreference(preference);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to update preference");
      // Revert on error
      setUnitPreferenceState(unitPreference);
    } finally {
      setIsSaving(false);
    }
  }

  function handleLogout() {
    router.replace("/(auth)/logout");
  }

  if (sessionLoading || isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: "Settings" }} />
        <View style={styles.container}>
          <ActivityIndicator />
        </View>
      </>
    );
  }

  if (!session) {
    return (
      <>
        <Stack.Screen options={{ title: "Settings" }} />
        <View style={styles.container}>
          <Text style={styles.error}>Please log in to access settings</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Settings" }} />
      <ScrollView style={styles.container}>
        {/* Unit Preference Section */}
        <Text style={styles.sectionHeader}>Measurement System</Text>
        <View style={styles.section}>
          <View style={styles.segmentedControl}>
            <Pressable
              style={[
                styles.segmentButton,
                styles.segmentButtonLeft,
                unitPreference === 'imperial' && styles.segmentButtonActive
              ]}
              onPress={() => handlePreferenceChange('imperial')}
              disabled={isSaving}
            >
              <Text
                style={[
                  styles.segmentButtonText,
                  unitPreference === 'imperial' && styles.segmentButtonTextActive
                ]}
              >
                Imperial
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.segmentButton,
                styles.segmentButtonRight,
                unitPreference === 'metric' && styles.segmentButtonActive
              ]}
              onPress={() => handlePreferenceChange('metric')}
              disabled={isSaving}
            >
              <Text
                style={[
                  styles.segmentButtonText,
                  unitPreference === 'metric' && styles.segmentButtonTextActive
                ]}
              >
                Metric
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Account Section */}
        <Text style={styles.sectionHeader}>Account</Text>
        <View style={styles.section}>
          <View style={styles.accountRow}>
            <Text style={styles.accountLabel}>Email</Text>
            <Text style={styles.accountValue}>{session.user.email}</Text>
          </View>
          <View style={styles.accountRow}>
            <Text style={styles.accountLabel}>User ID</Text>
            <Text style={styles.accountValue}>{session.user.id.slice(0, 8)}...</Text>
          </View>
        </View>

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  section: {
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  segmentedControl: {
    flexDirection: "row",
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
  },
  segmentButtonLeft: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  segmentButtonRight: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  segmentButtonActive: {
    backgroundColor: "#007AFF",
  },
  segmentButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
  },
  segmentButtonTextActive: {
    color: "white",
  },
  accountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  accountLabel: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
  accountValue: {
    fontSize: 16,
    color: "#666",
  },
  logoutButton: {
    backgroundColor: "#FF3B30",
    marginHorizontal: 16,
    marginTop: 32,
    marginBottom: 32,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  logoutButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  error: {
    color: "red",
    textAlign: "center",
    marginTop: 20,
  },
});

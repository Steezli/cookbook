import { Stack } from "expo-router";
import { View, StyleSheet } from "react-native";

import { GdprConsentBanner } from "@/features/ads/GdprConsentBanner";

export default function PublicLayout() {
  return (
    <View style={styles.container}>
      <Stack screenOptions={{ headerShown: false }} />
      <GdprConsentBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

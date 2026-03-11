import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import {
  accentWarm,
  bgPage,
  fontFamilyBody,
  fontFamilyBodyBold,
  fontFamilyDisplay,
  fontSize2xl,
  fontSizeBase,
  fontSizeLg,
  radiusPill,
  textPrimary,
  textSecondary,
  white,
} from "@/lib/tokens";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <View style={styles.container}>
        <Text style={styles.emoji}>🍳</Text>
        <Text style={styles.heading}>Page not found</Text>
        <Text style={styles.description}>
          This recipe seems to have gone missing. Let's get you back to the
          kitchen.
        </Text>
        <Link href="/" style={styles.button} accessibilityLabel="Go home">
          <Text style={styles.buttonText}>Go Home</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: bgPage,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  heading: {
    fontFamily: fontFamilyDisplay,
    fontSize: fontSize2xl,
    color: textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  description: {
    fontFamily: fontFamilyBody,
    fontSize: fontSizeBase,
    color: textSecondary,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
    maxWidth: 320,
  },
  button: {
    backgroundColor: accentWarm,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: radiusPill,
    overflow: "hidden",
  },
  buttonText: {
    fontFamily: fontFamilyBodyBold,
    fontSize: fontSizeLg,
    color: white,
    textAlign: "center",
  },
});

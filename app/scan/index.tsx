import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { ScanPhotoUpload } from "@/features/scan/ScanPhotoUpload";
import { ScanJobList } from "@/features/scan/ScanJobList";

export default function ScanHub() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Recipe Scanner</Text>
        <Text style={styles.subtitle}>
          Upload photos to automatically extract recipes
        </Text>
      </View>

      <View style={styles.content}>
        <ScanPhotoUpload />
        <ScanJobList />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
  },
  content: {
    flex: 1,
  },
});
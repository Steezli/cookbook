import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  FlatList,
  Modal,
  Pressable,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { uploadScanPhotosWithValidation, ScanUploadResult } from "./scan-upload";

interface ScanPhotoUploadProps {
  onUploadComplete?: () => void;
}

export function ScanPhotoUpload({ onUploadComplete }: ScanPhotoUploadProps) {
  const [selectedImages, setSelectedImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<ScanUploadResult | null>(null);

  const handleImageSelect = useCallback(async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Sorry, we need camera roll permissions to make this work!"
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedImages(prev => [...prev, ...result.assets]);
      setUploadResult(null);
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (selectedImages.length === 0) return;

    setUploading(true);
    try {
      // Convert all ImagePicker assets to File format
      const files = await Promise.all(
        selectedImages.map(async (image, index) => {
          const response = await fetch(image.uri);
          const blob = await response.blob();
          return new File([blob], image.fileName || `scan-${index + 1}.jpg`, {
            type: image.mimeType || "image/jpeg",
          });
        })
      );

      const result = await uploadScanPhotosWithValidation(files);
      setUploadResult(result);

      if (result.success) {
        setSelectedImages([]);
        onUploadComplete?.();
      }
    } catch (error) {
      setUploadResult({
        success: false,
        error: "Upload failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setUploading(false);
    }
  }, [selectedImages, onUploadComplete]);

  const clearSelection = useCallback(() => {
    setSelectedImages([]);
    setUploadResult(null);
  }, []);

  const removeImage = useCallback((index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const moveImage = useCallback((fromIndex: number, toIndex: number) => {
    setSelectedImages(prev => {
      const newImages = [...prev];
      const [movedImage] = newImages.splice(fromIndex, 1);
      newImages.splice(toIndex, 0, movedImage);
      return newImages;
    });
  }, []);

  const getTotalSize = useCallback(() => {
    return selectedImages.reduce((total, img) => total + (img.fileSize || 0), 0);
  }, [selectedImages]);

  const formatFileSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload Recipe Photo{selectedImages.length > 1 ? 's' : ''}</Text>

      {/* Image Selection Button - Always visible */}
      <TouchableOpacity style={styles.uploadArea} onPress={handleImageSelect}>
        <Text style={styles.uploadIcon}>📷</Text>
        <Text style={styles.uploadText}>
          {selectedImages.length === 0 ? 'Tap to select photos' : 'Add more photos'}
        </Text>
        <Text style={styles.uploadSubtext}>
          JPEG, PNG, or WebP up to 10MB each
        </Text>
      </TouchableOpacity>

      {selectedImages.length > 0 && (
        <View>
          {/* Image Count and Size */}
          <View style={styles.imageStats}>
            <Text style={styles.imageCount}>
              {selectedImages.length} photo{selectedImages.length > 1 ? 's' : ''} selected
            </Text>
            <Text style={styles.totalSize}>
              Total: {formatFileSize(getTotalSize())} MB
            </Text>
          </View>

          {/* Image Gallery */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gallery}>
            {selectedImages.map((image, index) => (
              <View key={`${image.uri}-${index}`} style={styles.galleryItem}>
                <TouchableOpacity onPress={() => setPreviewImage(image.uri)}>
                  <Image
                    source={{ uri: image.uri }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                  />
                </TouchableOpacity>

                {/* Remove button */}
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeImage(index)}
                >
                  <Text style={styles.removeButtonText}>✕</Text>
                </TouchableOpacity>

                {/* Reorder buttons */}
                <View style={styles.reorderButtons}>
                  {index > 0 && (
                    <TouchableOpacity
                      style={styles.reorderButton}
                      onPress={() => moveImage(index, index - 1)}
                    >
                      <Text style={styles.reorderButtonText}>←</Text>
                    </TouchableOpacity>
                  )}
                  {index < selectedImages.length - 1 && (
                    <TouchableOpacity
                      style={styles.reorderButton}
                      onPress={() => moveImage(index, index + 1)}
                    >
                      <Text style={styles.reorderButtonText}>→</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Image number badge */}
                <View style={styles.imageBadge}>
                  <Text style={styles.imageBadgeText}>{index + 1}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Clear All Button */}
          <TouchableOpacity style={styles.clearAllButton} onPress={clearSelection}>
            <Text style={styles.clearAllButtonText}>Clear All</Text>
          </TouchableOpacity>

          {/* Upload Button */}
          <TouchableOpacity
            style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
            onPress={handleUpload}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text style={[styles.uploadButtonText, styles.uploadButtonTextLoading]}>
                  Uploading...
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.uploadButtonText}>
                  📤 Upload {selectedImages.length} Photo{selectedImages.length > 1 ? 's' : ''} & Start Scan
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Upload Result */}
      {uploadResult && (
        <View style={[
          styles.resultContainer,
          uploadResult.success ? styles.resultSuccess : styles.resultError
        ]}>
          <Text style={[
            styles.resultTitle,
            uploadResult.success ? styles.resultTitleSuccess : styles.resultTitleError
          ]}>
            {uploadResult.success ? "Success!" : "Upload Failed"}
          </Text>
          <Text style={styles.resultMessage}>
            {uploadResult.message || uploadResult.error}
          </Text>

          {uploadResult.success && uploadResult.jobId && (
            <Text style={styles.jobId}>
              Job ID: {uploadResult.jobId}
            </Text>
          )}

          {uploadResult.qualityEstimate && uploadResult.qualityEstimate.recommendations.length > 0 && (
            <View style={styles.qualityTips}>
              <Text style={styles.qualityTipsTitle}>Quality Tips:</Text>
              {uploadResult.qualityEstimate.recommendations.map((rec, index) => (
                <Text key={index} style={styles.qualityTip}>• {rec}</Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Full-size Image Preview Modal */}
      <Modal
        visible={previewImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setPreviewImage(null)}>
          <View style={styles.modalContent}>
            {previewImage && (
              <Image
                source={{ uri: previewImage }}
                style={styles.fullPreviewImage}
                resizeMode="contain"
              />
            )}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setPreviewImage(null)}
            >
              <Text style={styles.modalCloseButtonText}>✕ Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: "#d1d5db",
    borderStyle: "dashed",
    borderRadius: 8,
    padding: 32,
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  uploadIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  uploadText: {
    fontSize: 18,
    color: "#374151",
    marginBottom: 8,
    fontWeight: "500",
  },
  uploadSubtext: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  imageStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    padding: 12,
    borderRadius: 6,
    marginTop: 16,
    marginBottom: 12,
  },
  imageCount: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },
  totalSize: {
    fontSize: 12,
    color: "#6b7280",
  },
  gallery: {
    marginBottom: 16,
  },
  galleryItem: {
    position: "relative",
    marginRight: 12,
  },
  thumbnail: {
    width: 120,
    height: 120,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#d1d5db",
  },
  removeButton: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#ef4444",
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  removeButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  reorderButtons: {
    position: "absolute",
    bottom: 4,
    left: 4,
    right: 4,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  reorderButton: {
    backgroundColor: "rgba(37, 99, 235, 0.9)",
    borderRadius: 4,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  reorderButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  imageBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  imageBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "600",
  },
  clearAllButton: {
    backgroundColor: "#f3f4f6",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
    marginBottom: 12,
  },
  clearAllButtonText: {
    color: "#6b7280",
    fontSize: 14,
    fontWeight: "500",
  },
  uploadButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 8,
  },
  uploadButtonTextLoading: {
    marginLeft: 12,
  },
  resultContainer: {
    marginTop: 16,
    padding: 16,
    borderRadius: 6,
    borderWidth: 1,
  },
  resultSuccess: {
    backgroundColor: "#f0fdf4",
    borderColor: "#86efac",
  },
  resultError: {
    backgroundColor: "#fef2f2",
    borderColor: "#fca5a5",
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  resultTitleSuccess: {
    color: "#16a34a",
  },
  resultTitleError: {
    color: "#dc2626",
  },
  resultMessage: {
    fontSize: 14,
    marginBottom: 8,
  },
  jobId: {
    fontSize: 12,
    color: "#16a34a",
    fontFamily: "monospace",
  },
  qualityTips: {
    marginTop: 12,
  },
  qualityTipsTitle: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    color: "#374151",
  },
  qualityTip: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    height: "80%",
    justifyContent: "center",
    alignItems: "center",
  },
  fullPreviewImage: {
    width: "100%",
    height: "100%",
  },
  modalCloseButton: {
    marginTop: 20,
    backgroundColor: "#ef4444",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
  },
  modalCloseButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "500",
  },
});
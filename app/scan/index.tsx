import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ImagePlus, X, Upload } from 'lucide-react-native';
import { router } from 'expo-router';
import { PageContainer } from '@/components/nav/PageContainer';
import { useBreakpoint } from '@/lib/hooks/useBreakpoint';
import { uploadScanPhotosWithValidation, ScanUploadResult } from '@/features/scan/scan-upload';
import {
  fontFamilyDisplay,
  fontFamilyBody,
  fontFamilyBodyMedium,
  fontFamilyBodyBold,
  fontSize2xl,
  fontSizeBase,
  fontSizeSm,
  fontSizeXs,
  fontSizeLg,
  textPrimary,
  textSecondary,
  textTertiary,
  accentBlue,
  accentCoral,
  accentGreen,
  bgPage,
  bgCard,
  borderDefault,
  borderSubtle,
  radiusMd,
  radiusSm,
  radiusPill,
  white,
  shadowSm,
  shadowMd,
} from '@/lib/tokens';

export default function ScanUploadScreen() {
  const { breakpoint } = useBreakpoint();
  const isMobile = breakpoint === 'mobile';
  const isWeb = Platform.OS === 'web';

  const [selectedImages, setSelectedImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<ScanUploadResult | null>(null);

  const handleCameraCapture = useCallback(async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

      if (permissionResult.status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Camera permission is needed to take photos of recipes.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images' as ImagePicker.MediaType,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImages(prev => [...prev, ...result.assets]);
        setUploadResult(null);
      }
    } catch (e) {
      Alert.alert('Camera Unavailable', 'Camera is not available on this device.');
    }
  }, []);

  const handleLibrarySelect = useCallback(async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Photo library permission is needed to select recipe photos.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images' as ImagePicker.MediaType,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedImages(prev => [...prev, ...result.assets]);
      setUploadResult(null);
    }
  }, []);

  const removeImage = useCallback((index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setUploadResult(null);
  }, []);

  const clearAll = useCallback(() => {
    setSelectedImages([]);
    setUploadResult(null);
  }, []);

  const handleUpload = useCallback(async () => {
    if (selectedImages.length === 0) return;

    setUploading(true);
    try {
      const files = selectedImages.map((image, index) => ({
        uri: image.uri,
        name: image.fileName || `scan-${index + 1}.jpg`,
        type: image.mimeType || 'image/jpeg',
        size: image.fileSize,
      }));

      const result = await uploadScanPhotosWithValidation(files);
      setUploadResult(result);

      if (result.success && result.jobId) {
        setSelectedImages([]);
        // Navigate to job status or draft when ready
        router.push(`/scan/draft/${result.jobId}`);
      }
    } catch (error) {
      setUploadResult({
        success: false,
        photoUrls: [],
        error: 'Upload failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setUploading(false);
    }
  }, [selectedImages]);

  const uploadZoneMaxWidth = isMobile ? undefined : 600;

  return (
    <PageContainer>
      <ScrollView
        style={{ flex: 1, backgroundColor: bgPage }}
        contentContainerStyle={{
          padding: isMobile ? 16 : 24,
          paddingBottom: 40,
        }}
      >
        {/* Header */}
        <Text
          style={{
            fontFamily: fontFamilyDisplay,
            fontSize: fontSize2xl,
            color: textPrimary,
            marginBottom: 8,
          }}
        >
          Scan Recipe
        </Text>
        <Text
          style={{
            fontFamily: fontFamilyBody,
            fontSize: fontSizeBase,
            color: textSecondary,
            marginBottom: 24,
          }}
        >
          Upload photos of a recipe to automatically extract ingredients and instructions
        </Text>

        {/* Upload Zone */}
        <View
          style={{
            alignSelf: isMobile ? 'stretch' : 'center',
            width: isMobile ? '100%' : '100%',
            maxWidth: uploadZoneMaxWidth,
          }}
        >
          {/* Upload Area */}
          <View
            style={{
              borderWidth: 2,
              borderColor: borderDefault,
              borderStyle: 'dashed',
              borderRadius: radiusMd,
              padding: isMobile ? 24 : 32,
              alignItems: 'center',
              backgroundColor: bgCard,
              marginBottom: 20,
            }}
          >
            <Upload size={40} color={textTertiary} style={{ marginBottom: 12 }} />
            <Text
              style={{
                fontFamily: fontFamilyBodyMedium,
                fontSize: fontSizeLg,
                color: textPrimary,
                marginBottom: 4,
              }}
            >
              Upload Recipe Photos
            </Text>
            <Text
              style={{
                fontFamily: fontFamilyBody,
                fontSize: fontSizeSm,
                color: textSecondary,
                textAlign: 'center',
                marginBottom: 20,
              }}
            >
              JPEG, PNG, or WebP up to 10MB each
            </Text>

            {/* Upload Option Buttons */}
            <View
              style={{
                flexDirection: isMobile ? 'column' : 'row',
                gap: 12,
                width: '100%',
                alignItems: 'center',
              }}
            >
              {/* Camera button - hidden on web */}
              {!isWeb && (
                <Pressable
                  onPress={handleCameraCapture}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    backgroundColor: pressed ? '#0066DD' : accentBlue,
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    borderRadius: radiusSm,
                    width: isMobile ? '100%' : undefined,
                    minWidth: isMobile ? undefined : 180,
                  })}
                >
                  <Camera size={20} color={white} />
                  <Text
                    style={{
                      fontFamily: fontFamilyBodyBold,
                      fontSize: fontSizeBase,
                      color: white,
                    }}
                  >
                    Take Photo
                  </Text>
                </Pressable>
              )}

              {/* Library button */}
              <Pressable
                onPress={handleLibrarySelect}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: pressed ? '#E8E0D8' : white,
                  borderWidth: 1,
                  borderColor: borderDefault,
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  borderRadius: radiusSm,
                  width: isMobile ? '100%' : undefined,
                  minWidth: isMobile ? undefined : 180,
                })}
              >
                <ImagePlus size={20} color={textPrimary} />
                <Text
                  style={{
                    fontFamily: fontFamilyBodyMedium,
                    fontSize: fontSizeBase,
                    color: textPrimary,
                  }}
                >
                  {isWeb ? 'Choose Photo' : 'Choose from Library'}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Selected Photos Preview */}
          {selectedImages.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    fontFamily: fontFamilyBodyMedium,
                    fontSize: fontSizeBase,
                    color: textPrimary,
                  }}
                >
                  {selectedImages.length} photo{selectedImages.length !== 1 ? 's' : ''} selected
                </Text>
                <Pressable onPress={clearAll}>
                  <Text
                    style={{
                      fontFamily: fontFamilyBodyMedium,
                      fontSize: fontSizeSm,
                      color: accentCoral,
                    }}
                  >
                    Clear All
                  </Text>
                </Pressable>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12 }}
              >
                {selectedImages.map((image, index) => (
                  <View key={`${image.uri}-${index}`} style={{ position: 'relative' }}>
                    <Image
                      source={{ uri: image.uri }}
                      style={{
                        width: 100,
                        height: 100,
                        borderRadius: radiusSm,
                        borderWidth: 1,
                        borderColor: borderDefault,
                      }}
                      resizeMode="cover"
                    />
                    <Pressable
                      onPress={() => removeImage(index)}
                      style={{
                        position: 'absolute',
                        top: -6,
                        right: -6,
                        backgroundColor: accentCoral,
                        borderRadius: radiusPill,
                        width: 22,
                        height: 22,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <X size={12} color={white} />
                    </Pressable>
                    <View
                      style={{
                        position: 'absolute',
                        bottom: 4,
                        left: 4,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        borderRadius: radiusPill,
                        width: 20,
                        height: 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fontFamilyBodyBold,
                          fontSize: fontSizeXs,
                          color: white,
                        }}
                      >
                        {index + 1}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>

              {/* Upload / Scan Button */}
              <Pressable
                onPress={handleUpload}
                disabled={uploading}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: uploading
                    ? textTertiary
                    : pressed
                    ? '#0066DD'
                    : accentBlue,
                  paddingVertical: 14,
                  paddingHorizontal: 24,
                  borderRadius: radiusMd,
                  marginTop: 16,
                  opacity: uploading ? 0.7 : 1,
                })}
              >
                {uploading ? (
                  <>
                    <ActivityIndicator size="small" color={white} />
                    <Text
                      style={{
                        fontFamily: fontFamilyBodyBold,
                        fontSize: fontSizeLg,
                        color: white,
                      }}
                    >
                      Scanning...
                    </Text>
                  </>
                ) : (
                  <Text
                    style={{
                      fontFamily: fontFamilyBodyBold,
                      fontSize: fontSizeLg,
                      color: white,
                    }}
                  >
                    Scan Recipe
                  </Text>
                )}
              </Pressable>
            </View>
          )}

          {/* Upload Result */}
          {uploadResult && !uploadResult.success && (
            <View
              style={{
                backgroundColor: '#FEF2F2',
                borderWidth: 1,
                borderColor: '#FCA5A5',
                borderRadius: radiusSm,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamilyBodyBold,
                  fontSize: fontSizeBase,
                  color: '#991B1B',
                  marginBottom: 4,
                }}
              >
                Upload Failed
              </Text>
              <Text
                style={{
                  fontFamily: fontFamilyBody,
                  fontSize: fontSizeSm,
                  color: '#DC2626',
                }}
              >
                {uploadResult.message || uploadResult.error}
              </Text>
            </View>
          )}

          {/* Quality Tips */}
          {uploadResult?.qualityEstimate &&
            uploadResult.qualityEstimate.recommendations.length > 0 && (
              <View
                style={{
                  backgroundColor: bgCard,
                  borderRadius: radiusSm,
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    fontFamily: fontFamilyBodyMedium,
                    fontSize: fontSizeSm,
                    color: textPrimary,
                    marginBottom: 8,
                  }}
                >
                  Quality Tips:
                </Text>
                {uploadResult.qualityEstimate.recommendations.map((rec, index) => (
                  <Text
                    key={index}
                    style={{
                      fontFamily: fontFamilyBody,
                      fontSize: fontSizeXs,
                      color: textSecondary,
                      marginBottom: 2,
                    }}
                  >
                    {rec}
                  </Text>
                ))}
              </View>
            )}
        </View>
      </ScrollView>
    </PageContainer>
  );
}

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Platform,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ImagePlus, X, Upload } from 'lucide-react-native';
import { router } from 'expo-router';
import { showAlert } from '@/lib/alert';
import { PageContainer } from '@/components/nav/PageContainer';
import { useBreakpoint } from '@/lib/hooks/useBreakpoint';
import { uploadScanPhotosWithValidation, ScanUploadResult } from '@/features/scan/scan-upload';
import { RecentScans } from '@/features/scan/RecentScans';
import { useSubscription } from '@/features/subscriptions/SubscriptionContext';
import { ScanLimitError } from '@/features/scan/errors';
import { PaywallPlaceholder } from '@/features/subscriptions/PaywallPlaceholder';
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

  const { isSubscriber, scansRemaining, isLoading: subscriptionLoading, restorePurchases } = useSubscription();
  const [paywallVisible, setPaywallVisible] = useState(false);

  const [selectedImages, setSelectedImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<ScanUploadResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(f => ACCEPTED_IMAGE_TYPES.includes(f.type));

    if (imageFiles.length === 0) return;

    const assets: ImagePicker.ImagePickerAsset[] = imageFiles.map(file => ({
      uri: URL.createObjectURL(file),
      width: 0,
      height: 0,
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      type: 'image' as const,
    }));

    setSelectedImages(prev => [...prev, ...assets]);
    setUploadResult(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  }, []);

  const handleCameraCapture = useCallback(async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

      if (permissionResult.status !== 'granted') {
        showAlert(
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
      showAlert('Camera Unavailable', 'Camera is not available on this device.');
    }
  }, []);

  const handleLibrarySelect = useCallback(async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.status !== 'granted') {
      showAlert(
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
      const files = selectedImages.map((image, index) => {
        // expo-image-picker on iOS may return mimeType as "image/heic", "image",
        // or undefined. Normalize to a valid MIME type for validation.
        let mimeType = image.mimeType || 'image/jpeg';
        if (mimeType === 'image') mimeType = 'image/jpeg'; // bare "image" has no subtype
        return {
          uri: image.uri,
          name: image.fileName || `scan-${index + 1}.jpg`,
          type: mimeType,
          size: image.fileSize,
        };
      });

      const result = await uploadScanPhotosWithValidation(files, { isSubscriber });
      setUploadResult(result);

      if (result.success && result.jobId) {
        setSelectedImages([]);
        // Navigate to job status or draft when ready
        router.push(`/scan/draft/${result.jobId}`);
      }
    } catch (error) {
      if (error instanceof ScanLimitError) {
        setPaywallVisible(true);
        return;
      }
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
    <PageContainer style={Platform.OS !== 'web' ? { paddingTop: 0 } : undefined}>
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

        {/* Remaining scans badge for free users */}
        {!isSubscriber && !subscriptionLoading && scansRemaining <= 3 && scansRemaining > 0 && (
          <Text
            style={{
              fontFamily: fontFamilyBody,
              fontSize: fontSizeSm,
              color: textSecondary,
              marginBottom: 16,
            }}
          >
            {scansRemaining} scan{scansRemaining !== 1 ? 's' : ''} remaining this month
          </Text>
        )}

        {/* Main content: upload + recent scans */}
        <View
          style={{
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 24 : 32,
          }}
        >

        {/* Upload Zone */}
        <View
          style={{
            flex: isMobile ? undefined : 1,
            width: isMobile ? '100%' : undefined,
            maxWidth: uploadZoneMaxWidth,
          }}
        >
          {/* Upload Area — wrapped with raw <div> on web for HTML5 drag-and-drop */}
          {isWeb ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              style={{
                borderWidth: 2,
                borderColor: isDragging ? accentBlue : borderDefault,
                borderStyle: 'dashed',
                borderRadius: radiusMd,
                padding: isMobile ? 24 : 32,
                display: 'flex',
                flexDirection: 'column' as const,
                alignItems: 'center',
                backgroundColor: isDragging ? `${accentBlue}0D` : bgCard,
                marginBottom: 20,
                transition: 'border-color 0.15s ease, background-color 0.15s ease',
                cursor: isDragging ? 'copy' : undefined,
              }}
            >
              <Upload size={40} color={isDragging ? accentBlue : textTertiary} style={{ marginBottom: 12 }} />
              <Text
                style={{
                  fontFamily: fontFamilyBodyMedium,
                  fontSize: fontSizeLg,
                  color: isDragging ? accentBlue : textPrimary,
                  marginBottom: 4,
                }}
              >
                {isDragging ? 'Drop photos here' : 'Upload Recipe Photos'}
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
                {isDragging ? 'Release to add photos' : 'Drag & drop or choose files — JPEG, PNG, or WebP up to 10MB each'}
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
                    Choose Photo
                  </Text>
                </Pressable>
              </View>
            </div>
          ) : (
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
                  flexDirection: 'column',
                  gap: 12,
                  width: '100%',
                  alignItems: 'center',
                }}
              >
                {/* Camera button */}
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
                    width: '100%',
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
                    width: '100%',
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
                    Choose from Library
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

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

        {/* Recent Scans */}
        <View
          style={{
            flex: isMobile ? undefined : 1,
            maxWidth: isMobile ? undefined : 400,
          }}
        >
          <RecentScans limit={5} />
        </View>

        </View>{/* end main content row/column */}
      </ScrollView>
      <PaywallPlaceholder visible={paywallVisible} onDismiss={() => setPaywallVisible(false)} />
    </PageContainer>
  );
}

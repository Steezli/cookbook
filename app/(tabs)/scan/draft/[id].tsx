import React, { useState, useEffect } from 'react';
import { Platform, View, Text, ActivityIndicator, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { PageContainer } from '@/components/nav/PageContainer';
import { DraftReview } from '@/features/scan/DraftReview';
import { DraftEditor } from '@/features/scan/DraftEditor';
import { DraftListView } from '@/features/scan/DraftListView';
import { ScanDraft, scanDraftService } from '@/lib/scan/scan-draft-service';
import { subscribeToJob, getJobPhotos } from '@/features/scan/scan-service';
import { useSession } from '@/features/auth/session';
import {
  accentBlue,
  accentWarm,
  bgPage,
  errorBg,
  errorBorder,
  errorText,
  errorTitle,
  fontFamilyBody,
  fontFamilyBodyMedium,
  fontSizeBase,
  fontSizeSm,
  fontSizeXs,
  fontSizeLg,
  radiusMd,
  radiusSm,
  textPrimary,
  textSecondary,
  textTertiary,
  white,
} from '@/lib/tokens';

type ScreenMode = 'loading' | 'processing' | 'single' | 'multi' | 'error';

/**
 * Calculate a reasonable timeout based on image count.
 * Base: 60s for 1 image. Each additional image adds 30s.
 * Minimum: 60s. Cap: 180s (3 minutes).
 */
function getTimeoutMs(imageCount: number): number {
  const base = 60_000;
  const perImage = 30_000;
  const additional = Math.max(0, imageCount - 1) * perImage;
  return Math.min(base + additional, 180_000);
}

/**
 * Friendly time estimate string for the user.
 */
function getTimeEstimate(imageCount: number): string {
  if (imageCount <= 1) return 'This usually takes 10–30 seconds';
  if (imageCount <= 3) return `Processing ${imageCount} photos — this may take up to a minute`;
  return `Processing ${imageCount} photos — this may take 1–2 minutes`;
}

export default function DraftReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, isLoading: authLoading } = useSession();
  const [mode, setMode] = useState<ScreenMode>('loading');
  const [singleDraft, setSingleDraft] = useState<ScanDraft | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageCount, setImageCount] = useState(1);
  const [retryCount, setRetryCount] = useState(0);

  const userId = session?.user?.id;

  // On native, the scan Stack header handles safe area — don't double-pad
  const containerStyle = Platform.OS !== 'web' ? { paddingTop: 0 } : undefined;

  useEffect(() => {
    if (!id || !userId) return;

    let channel: ReturnType<typeof subscribeToJob> | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let pollIntervalId: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const unsubscribe = () => {
      if (channel) {
        channel.unsubscribe();
        channel = null;
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (pollIntervalId) {
        clearInterval(pollIntervalId);
        pollIntervalId = null;
      }
    };

    const resolveDrafts = async (drafts: ScanDraft[]) => {
      if (cancelled) return false;
      if (drafts.length === 0) return false;
      if (drafts.length === 1) {
        setSingleDraft(drafts[0]);
        setMode('single');
      } else {
        setMode('multi');
      }
      return true;
    };

    const detect = async () => {
      try {
        setMode('loading');
        setError(null);

        // Fetch image count for dynamic timeout and UX
        let photoCount = 1;
        try {
          const photos = await getJobPhotos(id);
          photoCount = photos.length;
          setImageCount(photoCount);
        } catch {
          // Non-critical — fall back to default
        }

        const drafts = await scanDraftService.getDraftsByJobId(id, userId);

        if (cancelled) return;

        const resolved = await resolveDrafts(drafts);
        if (resolved) return;

        // No drafts yet — subscribe and poll for job completion
        setMode('processing');

        const timeoutMs = getTimeoutMs(photoCount);

        timeoutId = setTimeout(() => {
          unsubscribe();
          if (!cancelled) {
            setError(
              photoCount > 1
                ? `Processing ${photoCount} photos is taking longer than expected. The scan may still complete — you can wait or try again.`
                : 'Processing is taking longer than expected. Please try again.'
            );
            setMode('error');
          }
        }, timeoutMs);

        channel = subscribeToJob(id, async (job) => {
          if (cancelled) return;
          if (job.status === 'completed') {
            unsubscribe();
            try {
              const retryDrafts = await scanDraftService.getDraftsByJobId(id, userId);
              if (!cancelled) {
                const retryResolved = await resolveDrafts(retryDrafts);
                if (!retryResolved) {
                  setError('Draft not found after processing completed. Please try again.');
                  setMode('error');
                }
              }
            } catch (err) {
              if (!cancelled) {
                setError(err instanceof Error ? err.message : 'Failed to load drafts');
                setMode('error');
              }
            }
          } else if (job.status === 'failed') {
            unsubscribe();
            if (!cancelled) {
              setError('Scan processing failed. Please try again.');
              setMode('error');
            }
          }
        });

        // Polling fallback every 5 seconds (slightly less aggressive than before)
        pollIntervalId = setInterval(async () => {
          if (cancelled) return;
          try {
            const polledDrafts = await scanDraftService.getDraftsByJobId(id, userId);
            if (polledDrafts.length > 0 && !cancelled) {
              unsubscribe();
              await resolveDrafts(polledDrafts);
            }
          } catch {
            // Ignore polling errors
          }
        }, 5000);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load drafts');
          setMode('error');
        }
      }
    };

    detect();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [id, userId, retryCount]);

  const handleRetry = () => {
    setRetryCount(c => c + 1);
  };

  // --- Auth loading ---
  if (authLoading) {
    return (
      <PageContainer style={containerStyle}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bgPage }}>
          <ActivityIndicator size="large" color={accentBlue} />
        </View>
      </PageContainer>
    );
  }

  // --- Loading / Processing ---
  if (mode === 'loading' || mode === 'processing') {
    const isProcessing = mode === 'processing';
    return (
      <PageContainer style={containerStyle}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bgPage, padding: 24 }}>
          <ActivityIndicator size="large" color={accentWarm} />
          <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeBase, color: textPrimary, marginTop: 16, textAlign: 'center' }}>
            {isProcessing
              ? imageCount > 1
                ? `Processing ${imageCount} photos...`
                : 'Processing your scan...'
              : 'Loading drafts...'}
          </Text>
          {isProcessing && (
            <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeSm, color: textSecondary, marginTop: 8, textAlign: 'center' }}>
              {getTimeEstimate(imageCount)}
            </Text>
          )}
          {isProcessing && imageCount > 1 && (
            <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeXs, color: textTertiary, marginTop: 6, textAlign: 'center' }}>
              Multi-photo scans take longer — hang tight!
            </Text>
          )}
        </View>
      </PageContainer>
    );
  }

  // --- Error ---
  if (mode === 'error') {
    return (
      <PageContainer style={containerStyle}>
        <View style={{ flex: 1, padding: 24, backgroundColor: bgPage, justifyContent: 'center' }}>
          <View
            style={{
              backgroundColor: errorBg,
              borderWidth: 1,
              borderColor: errorBorder,
              borderRadius: radiusMd,
              padding: 24,
            }}
          >
            <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeLg, color: errorTitle, marginBottom: 8 }}>
              Processing Delayed
            </Text>
            <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeBase, color: errorText, lineHeight: 22 }}>
              {error || 'An unexpected error occurred'}
            </Text>

            {/* Retry button */}
            <Pressable
              onPress={handleRetry}
              style={({ pressed }) => ({
                marginTop: 20,
                backgroundColor: pressed ? '#0066DD' : accentBlue,
                borderRadius: radiusSm,
                paddingVertical: 12,
                paddingHorizontal: 24,
                alignItems: 'center' as const,
              })}
            >
              <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeBase, color: white }}>
                Check Again
              </Text>
            </Pressable>

            {/* Back to scanner button */}
            <Pressable
              onPress={() => router.back()}
              style={{ marginTop: 12, alignItems: 'center' as const, paddingVertical: 8 }}
            >
              <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeSm, color: textSecondary }}>
                Back to Scanner
              </Text>
            </Pressable>
          </View>
        </View>
      </PageContainer>
    );
  }

  // --- Multi-draft: render DraftListView ---
  if (mode === 'multi') {
    return (
      <PageContainer style={containerStyle}>
        <DraftListView jobId={id!} />
      </PageContainer>
    );
  }

  // --- Single-draft: backward-compatible flow ---
  if (isEditing) {
    return (
      <PageContainer style={containerStyle}>
        <DraftEditor
          draftId={id!}
          onCancel={() => setIsEditing(false)}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer style={containerStyle}>
      <DraftReview
        draftId={id!}
        onEdit={() => setIsEditing(true)}
      />
    </PageContainer>
  );
}

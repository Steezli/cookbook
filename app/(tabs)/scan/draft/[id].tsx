import React, { useState, useEffect, useRef } from 'react';
import {
  Image,
  Platform,
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { PageContainer } from '@/components/nav/PageContainer';
import { DraftReview } from '@/features/scan/DraftReview';
import { DraftEditor } from '@/features/scan/DraftEditor';
import { DraftListView } from '@/features/scan/DraftListView';
import { ScanDraft, scanDraftService } from '@/lib/scan/scan-draft-service';
import {
  getJobById,
  getJobPhotos,
  subscribeToJob,
  type ScanJob,
} from '@/features/scan/scan-service';
import { useSession } from '@/features/auth/session';
import { Check, Clock, Loader, AlertTriangle, FileText } from 'lucide-react-native';
import {
  accentBlue,
  accentGreen,
  accentWarm,
  bgCard,
  bgCardWarm,
  bgPage,
  borderDefault,
  errorBg,
  errorBorder,
  errorText,
  errorTitle,
  fontFamilyBody,
  fontFamilyBodyMedium,
  fontFamilyDisplay,
  fontSizeBase,
  fontSizeSm,
  fontSizeXs,
  fontSizeLg,
  fontSize2xl,
  radiusMd,
  radiusSm,
  textPrimary,
  textSecondary,
  textTertiary,
  white,
} from '@/lib/tokens';

type ScreenMode = 'processing' | 'single' | 'multi' | 'error';

type JobPhase = 'uploading' | 'queued' | 'processing' | 'completed' | 'failed';

const PHASE_LABELS: Record<JobPhase, string> = {
  uploading: 'Uploading photos...',
  queued: 'Waiting in queue...',
  processing: 'Reading your recipes...',
  completed: 'Done!',
  failed: 'Processing failed',
};

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

export default function DraftReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, isLoading: authLoading } = useSession();
  const [mode, setMode] = useState<ScreenMode>('processing');
  const [singleDraft, setSingleDraft] = useState<ScanDraft | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Processing state
  const [phase, setPhase] = useState<JobPhase>('uploading');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [imageCount, setImageCount] = useState(0);
  const [draftsFound, setDraftsFound] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

  const userId = session?.user?.id;

  const containerStyle = Platform.OS !== 'web' ? { paddingTop: 0 } : undefined;

  // Elapsed time ticker
  useEffect(() => {
    if (mode !== 'processing') return;

    const interval = setInterval(() => {
      setElapsed(e => e + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [mode]);

  // Main processing effect
  useEffect(() => {
    if (!id || !userId) return;

    let channel: ReturnType<typeof subscribeToJob> | null = null;
    let pollIntervalId: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const cleanup = () => {
      if (channel) {
        channel.unsubscribe();
        channel = null;
      }
      if (pollIntervalId) {
        clearInterval(pollIntervalId);
        pollIntervalId = null;
      }
    };

    const resolveDrafts = async (drafts: ScanDraft[]) => {
      if (cancelled) return false;
      if (drafts.length === 0) return false;
      setDraftsFound(drafts.length);
      if (drafts.length === 1) {
        setSingleDraft(drafts[0]);
        setMode('single');
      } else {
        setMode('multi');
      }
      return true;
    };

    const start = async () => {
      try {
        setMode('processing');
        setError(null);
        setElapsed(0);
        setDraftsFound(0);
        setPhase('uploading');

        // 1. Fetch job to get current status
        let job: ScanJob;
        try {
          job = await getJobById(id);
          setPhase(job.status as JobPhase);
        } catch {
          setPhase('queued');
          job = { status: 'queued' } as ScanJob;
        }

        // 2. Fetch photo URLs for thumbnails (filter out inline:// placeholders)
        try {
          const photos = await getJobPhotos(id);
          if (!cancelled) {
            setImageCount(photos.length);
            setPhotoUrls(photos.filter(u => !u.startsWith('inline://')));
          }
        } catch {
          // Non-critical
        }

        // 3. Check for existing drafts (job may already be done)
        const drafts = await scanDraftService.getDraftsByJobId(id, userId);
        if (cancelled) return;
        const resolved = await resolveDrafts(drafts);
        if (resolved) return;

        // 4. If job already failed, show error
        if (job.status === 'failed') {
          setError(job.error_message || 'Scan processing failed');
          setPhase('failed');
          setMode('error');
          return;
        }

        // 5. Subscribe for real-time updates
        channel = subscribeToJob(id, async (updatedJob) => {
          if (cancelled) return;
          setPhase(updatedJob.status as JobPhase);

          if (updatedJob.status === 'completed') {
            // Give DB a moment to propagate drafts, then fetch
            await new Promise(r => setTimeout(r, 1000));
            try {
              const newDrafts = await scanDraftService.getDraftsByJobId(id, userId);
              if (!cancelled) {
                cleanup();
                const ok = await resolveDrafts(newDrafts);
                if (!ok) {
                  // Drafts not yet visible — keep polling
                  setPhase('completed');
                }
              }
            } catch (err) {
              if (!cancelled) {
                setError(err instanceof Error ? err.message : 'Failed to load results');
                setMode('error');
              }
            }
          } else if (updatedJob.status === 'failed') {
            cleanup();
            if (!cancelled) {
              setError(updatedJob.error_message || 'Scan processing failed');
              setMode('error');
            }
          }
        });

        // 6. Poll for drafts every 4 seconds as fallback
        //    (realtime channel may miss events, and drafts may appear
        //     slightly after the job status changes to completed)
        pollIntervalId = setInterval(async () => {
          if (cancelled) return;
          try {
            // Also refresh job status and photo URLs in case realtime missed it
            try {
              const freshJob = await getJobById(id);
              if (!cancelled) {
                setPhase(freshJob.status as JobPhase);

                // Refresh photo URLs — edge function updates them after saving to Storage
                if (photoUrls.length === 0) {
                  try {
                    const photos = await getJobPhotos(id);
                    const real = photos.filter(u => !u.startsWith('inline://'));
                    if (real.length > 0 && !cancelled) setPhotoUrls(real);
                  } catch { /* non-critical */ }
                }
              }

              if (freshJob.status === 'failed') {
                cleanup();
                if (!cancelled) {
                  setError(freshJob.error_message || 'Scan processing failed');
                  setMode('error');
                }
                return;
              }
            } catch {
              // Non-critical
            }

            const polledDrafts = await scanDraftService.getDraftsByJobId(id, userId);
            if (polledDrafts.length > 0 && !cancelled) {
              cleanup();
              await resolveDrafts(polledDrafts);
            }
          } catch {
            // Ignore polling errors
          }
        }, 4000);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Something went wrong');
          setMode('error');
        }
      }
    };

    start();

    return () => {
      cancelled = true;
      cleanup();
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

  // --- Processing / waiting for results ---
  if (mode === 'processing') {
    const isActive = phase === 'processing' || phase === 'queued' || phase === 'uploading';
    const isDone = phase === 'completed';
    const photoCount = imageCount || 1;

    return (
      <PageContainer style={containerStyle}>
        <ScrollView
          contentContainerStyle={{ padding: 24, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Text
            style={{
              fontFamily: fontFamilyDisplay,
              fontSize: fontSize2xl,
              color: textPrimary,
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            Scanning {photoCount > 1 ? `${photoCount} Photos` : 'Your Recipe'}
          </Text>

          <Text
            style={{
              fontFamily: fontFamilyBody,
              fontSize: fontSizeSm,
              color: textSecondary,
              textAlign: 'center',
              marginBottom: 32,
            }}
          >
            {photoCount > 1
              ? 'We\'re reading each photo and extracting any recipes found'
              : 'We\'re reading the photo and extracting the recipe'}
          </Text>

          {/* Photo thumbnails */}
          {photoUrls.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                gap: 12,
                paddingBottom: 24,
                justifyContent: photoUrls.length <= 3 ? 'center' : undefined,
                flexGrow: photoUrls.length <= 3 ? 1 : undefined,
              }}
            >
              {photoUrls.map((url, i) => (
                <View key={i} style={{ alignItems: 'center', gap: 6 }}>
                  <Image
                    source={{ uri: url }}
                    style={{
                      width: 80,
                      height: 100,
                      borderRadius: radiusSm,
                      borderWidth: 1,
                      borderColor: borderDefault,
                    }}
                    resizeMode="cover"
                  />
                  <Text
                    style={{
                      fontFamily: fontFamilyBody,
                      fontSize: fontSizeXs,
                      color: textTertiary,
                    }}
                  >
                    Photo {i + 1}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Status steps */}
          <View
            style={{
              backgroundColor: bgCard,
              borderRadius: radiusMd,
              padding: 20,
              gap: 16,
            }}
          >
            <StatusStep
              label="Photos uploaded"
              done={phase !== 'uploading'}
              active={phase === 'uploading'}
            />
            <StatusStep
              label="In processing queue"
              done={phase === 'processing' || phase === 'completed'}
              active={phase === 'queued'}
            />
            <StatusStep
              label={photoCount > 1
                ? `Reading ${photoCount} photos for recipes`
                : 'Reading photo and extracting recipe'}
              done={phase === 'completed'}
              active={phase === 'processing'}
            />
            <StatusStep
              label={draftsFound > 0
                ? `Found ${draftsFound} recipe${draftsFound !== 1 ? 's' : ''}!`
                : 'Preparing your results'}
              done={draftsFound > 0}
              active={isDone && draftsFound === 0}
            />
          </View>

          {/* Elapsed time */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              marginTop: 24,
            }}
          >
            <Clock size={14} color={textTertiary} />
            <Text
              style={{
                fontFamily: fontFamilyBody,
                fontSize: fontSizeXs,
                color: textTertiary,
              }}
            >
              {formatElapsed(elapsed)} elapsed
            </Text>
          </View>

          {/* Helpful context */}
          {isActive && elapsed >= 15 && (
            <View
              style={{
                backgroundColor: bgCardWarm,
                borderRadius: radiusMd,
                padding: 16,
                marginTop: 20,
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamilyBody,
                  fontSize: fontSizeSm,
                  color: textSecondary,
                  textAlign: 'center',
                  lineHeight: 20,
                }}
              >
                {elapsed < 45
                  ? 'This is normal — AI recipe reading takes a moment, especially with multiple photos.'
                  : elapsed < 90
                  ? 'Still working! Multi-photo scans can take up to a couple of minutes.'
                  : 'Taking longer than usual. The scan is still processing — you can wait here or check back from the scanner page.'}
              </Text>
            </View>
          )}
        </ScrollView>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <AlertTriangle size={20} color={errorTitle} />
              <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeLg, color: errorTitle }}>
                Scan Failed
              </Text>
            </View>
            <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeBase, color: errorText, lineHeight: 22 }}>
              {error || 'An unexpected error occurred'}
            </Text>

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
                Try Again
              </Text>
            </Pressable>

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

  // --- Multi-draft ---
  if (mode === 'multi') {
    return (
      <PageContainer style={containerStyle}>
        <DraftListView jobId={id!} />
      </PageContainer>
    );
  }

  // --- Single-draft ---
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

// ---------------------------------------------------------------------------
// StatusStep — a single row in the processing pipeline
// ---------------------------------------------------------------------------

function StatusStep({
  label,
  done,
  active,
}: {
  label: string;
  done: boolean;
  active: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {/* Icon */}
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: done ? accentGreen : active ? accentWarm : borderDefault,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {done ? (
          <Check size={16} color={white} />
        ) : active ? (
          <ActivityIndicator size="small" color={white} />
        ) : (
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: white,
              opacity: 0.5,
            }}
          />
        )}
      </View>

      {/* Label */}
      <Text
        style={{
          fontFamily: done || active ? fontFamilyBodyMedium : fontFamilyBody,
          fontSize: fontSizeBase,
          color: done ? accentGreen : active ? textPrimary : textTertiary,
          flex: 1,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

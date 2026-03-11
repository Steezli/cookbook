import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { PageContainer } from '@/components/nav/PageContainer';
import { DraftReview } from '@/features/scans/DraftReview';
import { DraftEditor } from '@/features/scans/DraftEditor';
import { DraftListView } from '@/features/scans/DraftListView';
import { ScanDraft, scanDraftService } from '@/lib/scan/scan-draft-service';
import { subscribeToJob } from '@/features/scan/scan-service';
import { useSession } from '@/features/auth/session';
import {
  fontFamilyBody,
  fontFamilyBodyMedium,
  fontSizeSm,
  fontSizeXs,
  fontSizeLg,
  textSecondary,
  textTertiary,
  accentBlue,
  bgPage,
  radiusSm,
} from '@/lib/tokens';

type ScreenMode = 'loading' | 'processing' | 'single' | 'multi' | 'error';

export default function DraftReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, isLoading: authLoading } = useSession();
  const [mode, setMode] = useState<ScreenMode>('loading');
  const [singleDraft, setSingleDraft] = useState<ScanDraft | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = session?.user?.id;

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
      if (cancelled) return;
      if (drafts.length === 0) return false; // Signal: no drafts yet
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

        const drafts = await scanDraftService.getDraftsByJobId(id, userId);

        if (cancelled) return;

        const resolved = await resolveDrafts(drafts);
        if (resolved) return;

        // No drafts yet — subscribe and poll for job completion
        setMode('processing');

        timeoutId = setTimeout(() => {
          unsubscribe();
          if (!cancelled) {
            setError('Processing is taking longer than expected. Please try again.');
            setMode('error');
          }
        }, 60000);

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
                console.error('Failed to load drafts after job completion:', err);
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

        // Polling fallback every 4 seconds
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
        }, 4000);
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to detect draft mode:', err);
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
  }, [id, userId]);

  // --- Auth loading ---
  if (authLoading) {
    return (
      <PageContainer>
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
      <PageContainer>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bgPage }}>
          <ActivityIndicator size="large" color={accentBlue} />
          <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeSm, color: textSecondary, marginTop: 12 }}>
            {isProcessing ? 'Processing your scan...' : 'Loading drafts...'}
          </Text>
          {isProcessing && (
            <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeXs, color: textTertiary, marginTop: 6 }}>
              This usually takes 10-30 seconds
            </Text>
          )}
        </View>
      </PageContainer>
    );
  }

  // --- Error ---
  if (mode === 'error') {
    return (
      <PageContainer>
        <View style={{ flex: 1, padding: 16, backgroundColor: bgPage }}>
          <View
            style={{
              backgroundColor: '#FEF2F2',
              borderWidth: 1,
              borderColor: '#FCA5A5',
              borderRadius: radiusSm,
              padding: 20,
            }}
          >
            <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeLg, color: '#991B1B', marginBottom: 8 }}>
              Error Loading Drafts
            </Text>
            <Text style={{ fontFamily: fontFamilyBody, fontSize: 16, color: '#DC2626' }}>
              {error || 'An unexpected error occurred'}
            </Text>
          </View>
        </View>
      </PageContainer>
    );
  }

  // --- Multi-draft: render DraftListView ---
  if (mode === 'multi') {
    return (
      <PageContainer>
        <DraftListView jobId={id!} />
      </PageContainer>
    );
  }

  // --- Single-draft: backward-compatible flow ---
  if (isEditing) {
    return (
      <PageContainer>
        <DraftEditor
          draftId={id!}
          onCancel={() => setIsEditing(false)}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <DraftReview
        draftId={id!}
        onEdit={() => setIsEditing(true)}
      />
    </PageContainer>
  );
}

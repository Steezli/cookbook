import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { getUserScanJobs, subscribeToUserJobs, ScanJob } from './scan-service';
import { getScanThumbnailUrl } from './scan-photos';
import { scanDraftService, ScanDraft } from '@/lib/scan/scan-draft-service';
import { useSession } from '@/features/auth/session';
import {
  fontFamilyBody,
  fontFamilyBodyMedium,
  fontFamilyBodyBold,
  fontSizeLg,
  fontSizeBase,
  fontSizeSm,
  fontSizeXs,
  textPrimary,
  textSecondary,
  textTertiary,
  accentGreen,
  accentCoral,
  bgCard,
  borderDefault,
  radiusSm,
  radiusMd,
} from '@/lib/tokens';

type ScanWithDraft = ScanJob & { draft?: ScanDraft | null; draftCount?: number };

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  queued: { color: '#f59e0b', label: 'Queued' },
  processing: { color: '#f59e0b', label: 'Processing...' },
  completed: { color: accentGreen, label: 'Ready to review' },
  failed: { color: accentCoral, label: 'Failed' },
  draft_saved: { color: accentGreen, label: 'Saved as draft' },
};

function getDisplayStatus(job: ScanWithDraft): { color: string; label: string } {
  if (job.status === 'completed' && job.draft) {
    if (job.draft.status === 'enhanced' || job.draft.status === 'needs_review') {
      return STATUS_CONFIG.draft_saved;
    }
    return STATUS_CONFIG.completed;
  }
  return STATUS_CONFIG[job.status] || STATUS_CONFIG.queued;
}

function getDisplayName(job: ScanWithDraft): string {
  if (job.draft?.recipe?.title) {
    return job.draft.recipe.title;
  }
  return `Scan #${job.id.slice(0, 8)}`;
}

function formatTimeAgo(timestamp: string): string {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

export function RecentScans({ limit = 5 }: { limit?: number }) {
  const { session } = useSession();
  const [jobs, setJobs] = useState<ScanWithDraft[]>([]);
  const [loading, setLoading] = useState(true);

  const loadJobs = async () => {
    if (!session?.user?.id) return;
    try {
      const [scanJobs, drafts] = await Promise.all([
        getUserScanJobs(),
        scanDraftService.getUserDrafts(session.user.id, undefined, 20, 0),
      ]);

      // Group drafts by jobId — keep first draft as representative, count all
      const draftsByJobId = new Map<string, ScanDraft[]>();
      for (const d of drafts) {
        const existing = draftsByJobId.get(d.jobId);
        if (existing) {
          existing.push(d);
        } else {
          draftsByJobId.set(d.jobId, [d]);
        }
      }

      const merged: ScanWithDraft[] = scanJobs.slice(0, limit).map((job) => {
        const jobDrafts = draftsByJobId.get(job.id) || [];
        return {
          ...job,
          draft: jobDrafts[0] || null,
          draftCount: jobDrafts.length,
        };
      });

      setJobs(merged);
    } catch (err) {
      console.error('Failed to load recent scans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();

    if (!session?.user?.id) return;
    const subscription = subscribeToUserJobs(session.user.id, (updatedJob) => {
      setJobs((prev) =>
        prev.map((job) => (job.id === updatedJob.id ? { ...updatedJob, draft: job.draft } : job))
      );
      // Re-fetch drafts when a job completes to get the recipe title
      if (updatedJob.status === 'completed') {
        setTimeout(loadJobs, 1500);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [session?.user?.id]);

  const handlePress = (job: ScanWithDraft) => {
    if (job.status === 'completed') {
      router.push(`/scan/draft/${job.id}`);
    }
  };

  if (loading) {
    return (
      <View style={{ paddingVertical: 24, alignItems: 'center' }}>
        <ActivityIndicator size="small" color={textTertiary} />
      </View>
    );
  }

  if (jobs.length === 0) {
    return null;
  }

  return (
    <View>
      <Text
        style={{
          fontFamily: fontFamilyBodyBold,
          fontSize: fontSizeLg,
          color: textPrimary,
          marginBottom: 12,
        }}
      >
        Recent Scans
      </Text>

      <View style={{ gap: 8 }}>
        {jobs.map((job) => {
          const status = getDisplayStatus(job);
          const name = getDisplayName(job);
          const isClickable = job.status === 'completed';

          return (
            <Pressable
              key={job.id}
              onPress={() => handlePress(job)}
              disabled={!isClickable}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: pressed ? borderDefault : bgCard,
                borderRadius: radiusMd,
                padding: 12,
                gap: 12,
                opacity: isClickable ? 1 : 0.8,
              })}
            >
              {/* Thumbnail */}
              <Image
                source={{ uri: getScanThumbnailUrl(job.photo_url, 100) }}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: radiusSm,
                  backgroundColor: '#E8E0D8',
                }}
              />

              {/* Info */}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Text
                    style={{
                      fontFamily: fontFamilyBodyMedium,
                      fontSize: fontSizeBase,
                      color: textPrimary,
                      flexShrink: 1,
                    }}
                    numberOfLines={1}
                  >
                    {name}
                  </Text>
                  {(job.draftCount ?? 0) > 1 && (
                    <View
                      style={{
                        backgroundColor: '#EFF6FF',
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fontFamilyBodyMedium,
                          fontSize: fontSizeXs,
                          color: '#1D4ED8',
                        }}
                      >
                        {job.draftCount} recipes
                      </Text>
                    </View>
                  )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: status.color,
                    }}
                  />
                  <Text
                    style={{
                      fontFamily: fontFamilyBody,
                      fontSize: fontSizeXs,
                      color: textSecondary,
                    }}
                  >
                    {status.label}
                  </Text>
                </View>
              </View>

              {/* Time ago (on larger screens) */}
              <Text
                style={{
                  fontFamily: fontFamilyBody,
                  fontSize: fontSizeXs,
                  color: textTertiary,
                }}
              >
                {formatTimeAgo(job.created_at)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

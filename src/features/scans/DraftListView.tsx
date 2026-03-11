import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { ScanDraft, scanDraftService } from '@/lib/scan/scan-draft-service';
import { getJobPhotos, subscribeToJob } from '@/features/scan/scan-service';
import { getScanPhotoUrl, getScanThumbnailUrl } from '@/features/scan/scan-photos';
import { useSession } from '@/features/auth/session';
import { useBreakpoint } from '@/lib/hooks/useBreakpoint';
import {
  getDraftProgress,
  getDraftDisplayStatus,
  canSaveAll,
  DraftDisplayStatus,
} from '@/lib/scan/multi-draft-helpers';
import { DraftReview } from './DraftReview';
import { DraftEditor } from './DraftEditor';
import {
  fontFamilyDisplay,
  fontFamilyBody,
  fontFamilyBodyMedium,
  fontFamilyBodyBold,
  fontSize2xl,
  fontSizeXl,
  fontSizeLg,
  fontSizeBase,
  fontSizeSm,
  fontSizeXs,
  textPrimary,
  textSecondary,
  textTertiary,
  accentBlue,
  accentCoral,
  accentGreen,
  accentWarm,
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
  noPhotoBg,
  noPhotoIcon,
  badgeGreenBg,
  badgeCoralBg,
  badgeYellowBg,
} from '@/lib/tokens';

interface DraftListViewProps {
  jobId: string;
}

// --- Confidence helpers (same logic as DraftReview) ---

const getConfidenceColor = (confidence: number): { bg: string; text: string } => {
  if (confidence >= 0.85) return { bg: '#DCFCE7', text: '#166534' };
  if (confidence >= 0.65) return { bg: '#FEF9C3', text: '#854D0E' };
  return { bg: '#FEF2F2', text: '#991B1B' };
};

const getConfidenceLabel = (confidence: number): string => {
  if (confidence >= 0.85) return 'High';
  if (confidence >= 0.65) return 'Medium';
  return 'Low';
};

// --- Display status helpers ---

const getStatusStyle = (status: DraftDisplayStatus): { bg: string; text: string; label: string } => {
  switch (status) {
    case 'saved':
      return { bg: badgeGreenBg, text: '#166534', label: 'Saved' };
    case 'needs_review':
      return { bg: badgeCoralBg, text: '#991B1B', label: 'Needs Review' };
    case 'pending':
      return { bg: badgeYellowBg, text: '#854D0E', label: 'Pending' };
  }
};

export function DraftListView({ jobId }: DraftListViewProps) {
  const { session } = useSession();
  const { breakpoint } = useBreakpoint();
  const isMobile = breakpoint === 'mobile';
  const isSideBySide = breakpoint === 'tablet' || breakpoint === 'web';

  const [drafts, setDrafts] = useState<ScanDraft[]>([]);
  const [selectedDraftIndex, setSelectedDraftIndex] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Batch save state
  const [batchSaving, setBatchSaving] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [batchFailures, setBatchFailures] = useState<string[]>([]); // draft IDs that failed

  const userId = session?.user?.id;

  // Load drafts and photos on mount
  useEffect(() => {
    if (!userId) return;

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

    const loadDrafts = async () => {
      try {
        setLoading(true);
        setError(null);

        const [draftResults, photos] = await Promise.all([
          scanDraftService.getDraftsByJobId(jobId, userId),
          getJobPhotos(jobId).catch((err) => {
            console.warn('Failed to load scan photos:', err);
            return [] as string[];
          }),
        ]);

        if (cancelled) return;

        // Resolve photo URLs
        const urls = photos.map((photoUrl: string) => {
          if (photoUrl.startsWith('http')) return photoUrl;
          return getScanPhotoUrl(photoUrl);
        });
        setPhotoUrls(urls);

        if (draftResults.length > 0) {
          setDrafts(draftResults);
          console.log(`[DraftList] Loaded ${draftResults.length} drafts for job ${jobId}`);
          setLoading(false);
          return;
        }

        // No drafts yet — job may still be processing. Subscribe + poll.
        console.log(`[DraftList] No drafts yet for job ${jobId}, waiting for processing...`);

        timeoutId = setTimeout(() => {
          unsubscribe();
          if (!cancelled) {
            setError('Processing is taking longer than expected. Please try again.');
            setLoading(false);
          }
        }, 60000);

        channel = subscribeToJob(jobId, async (job) => {
          if (cancelled) return;
          if (job.status === 'completed') {
            unsubscribe();
            try {
              const retryDrafts = await scanDraftService.getDraftsByJobId(jobId, userId);
              if (!cancelled) {
                setDrafts(retryDrafts);
                console.log(`[DraftList] Loaded ${retryDrafts.length} drafts for job ${jobId}`);
                setLoading(false);
              }
            } catch (err) {
              if (!cancelled) {
                console.error('[DraftList] Failed to load drafts after job completion:', err);
                setError(err instanceof Error ? err.message : 'Failed to load drafts');
                setLoading(false);
              }
            }
          } else if (job.status === 'failed') {
            unsubscribe();
            if (!cancelled) {
              setError('Scan processing failed. Please try again.');
              setLoading(false);
            }
          }
        });

        // Polling fallback every 4 seconds
        pollIntervalId = setInterval(async () => {
          if (cancelled) return;
          try {
            const polledDrafts = await scanDraftService.getDraftsByJobId(jobId, userId);
            if (polledDrafts.length > 0 && !cancelled) {
              unsubscribe();
              setDrafts(polledDrafts);
              console.log(`[DraftList] Loaded ${polledDrafts.length} drafts for job ${jobId} (poll)`);
              setLoading(false);
            }
          } catch {
            // Ignore polling errors
          }
        }, 4000);
      } catch (err) {
        if (!cancelled) {
          console.error('[DraftList] Failed to load drafts:', err);
          setError(err instanceof Error ? err.message : 'Failed to load drafts');
          setLoading(false);
        }
      }
    };

    loadDrafts();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [jobId, userId]);

  // Refresh drafts after a recipe is saved
  const refreshDrafts = async () => {
    if (!userId) return;
    try {
      const updated = await scanDraftService.getDraftsByJobId(jobId, userId);
      setDrafts(updated);
      // If the selected draft was saved, deselect and exit edit mode
      setIsEditing(false);
    } catch (err) {
      console.error('[DraftList] Failed to refresh drafts:', err);
    }
  };

  // Handle draft conversion (recipe saved) — stay on list, don't navigate away
  const handleDraftConverted = (_recipeId: string) => {
    refreshDrafts();
  };

  // Batch save all unsaved drafts sequentially
  const handleSaveAll = async () => {
    if (!userId || batchSaving) return;

    const unsavedDrafts = drafts.filter((d) => d.status !== 'ready');
    if (unsavedDrafts.length === 0) return;

    setBatchSaving(true);
    setBatchProgress({ current: 0, total: unsavedDrafts.length });
    setBatchFailures([]);

    const failures: string[] = [];

    for (let i = 0; i < unsavedDrafts.length; i++) {
      const draft = unsavedDrafts[i];
      setBatchProgress({ current: i + 1, total: unsavedDrafts.length });
      console.log(`[DraftList] Batch save: saving draft ${i + 1} of ${unsavedDrafts.length}`);

      try {
        await scanDraftService.convertToRecipe(draft.id, userId, {
          title: draft.recipe.title || `Recipe ${(draft.draftIndex ?? i) + 1}`,
          ingredients: draft.recipe.ingredients || [],
          instructions: draft.recipe.instructions || [],
          prepTimeMinutes: draft.recipe.prepTimeMinutes,
          cookTimeMinutes: draft.recipe.cookTimeMinutes,
          servings: draft.recipe.servings,
          tags: [],
        });
      } catch (err) {
        console.error(`[DraftList] Batch save failed for draft ${draft.id}:`, err);
        failures.push(draft.id);
      }
    }

    // Refresh draft list to reflect new statuses
    try {
      const updated = await scanDraftService.getDraftsByJobId(jobId, userId);
      setDrafts(updated);
    } catch (err) {
      console.error('[DraftList] Failed to refresh drafts after batch save:', err);
    }

    setBatchFailures(failures);
    setBatchSaving(false);
    setBatchProgress(null);
  };

  // --- Computed state ---
  const progress = getDraftProgress(drafts);
  const showSaveAll = canSaveAll(drafts);
  const selectedDraft = selectedDraftIndex !== null ? drafts[selectedDraftIndex] : null;

  // --- Loading state ---
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bgPage }}>
        <ActivityIndicator size="large" color={accentBlue} />
        <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeSm, color: textSecondary, marginTop: 12 }}>
          Loading drafts...
        </Text>
      </View>
    );
  }

  // --- Error state ---
  if (error) {
    return (
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
          <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeBase, color: '#DC2626' }}>
            {error}
          </Text>
        </View>
      </View>
    );
  }

  // --- Shared Photo Section ---
  const PhotoSection = () => (
    <View>
      {photoUrls.length > 0 ? (
        <View>
          <View style={{ height: isMobile ? 200 : 240, overflow: 'hidden', borderRadius: radiusSm }}>
            <Image
              source={{ uri: photoUrls[activePhotoIndex] }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </View>
          {photoUrls.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 8 }}
            >
              {photoUrls.map((url, index) => (
                <Pressable
                  key={index}
                  onPress={() => setActivePhotoIndex(index)}
                  style={{
                    borderWidth: 2,
                    borderColor: index === activePhotoIndex ? accentBlue : borderDefault,
                    borderRadius: radiusSm / 2,
                    overflow: 'hidden',
                  }}
                >
                  <Image
                    source={{ uri: getScanThumbnailUrl(url, 80) }}
                    style={{ width: 56, height: 56 }}
                    resizeMode="cover"
                  />
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      ) : (
        <View
          style={{
            height: 160,
            backgroundColor: noPhotoBg,
            borderRadius: radiusSm,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeSm, color: noPhotoIcon }}>
            No photos available
          </Text>
        </View>
      )}
    </View>
  );

  // --- Progress Bar ---
  const ProgressSection = () => {
    const progressPercent = progress.total > 0 ? (progress.saved / progress.total) * 100 : 0;

    return (
      <View style={{ backgroundColor: bgCard, borderRadius: radiusMd, padding: 16, ...shadowSm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeBase, color: textPrimary }}>
            {progress.allSaved ? 'All recipes saved!' : `${progress.saved} of ${progress.total} recipes saved`}
          </Text>
          {progress.allSaved && (
            <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeXs, color: '#166534' }}>
              ✓ Complete
            </Text>
          )}
        </View>

        {/* Progress bar track */}
        <View
          style={{
            height: 8,
            backgroundColor: borderDefault,
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${progressPercent}%`,
              backgroundColor: progress.allSaved ? accentGreen : accentBlue,
              borderRadius: 4,
            }}
          />
        </View>

        {/* Batch save button */}
        {showSaveAll && !progress.allSaved && (
          <Pressable
            onPress={handleSaveAll}
            disabled={batchSaving}
            accessibilityRole="button"
            accessibilityLabel={batchSaving ? 'Saving all drafts' : 'Save all drafts as recipes'}
            style={({ pressed }) => ({
              backgroundColor: batchSaving ? borderDefault : pressed ? '#16A34A' : accentGreen,
              paddingVertical: 10,
              paddingHorizontal: 20,
              borderRadius: radiusSm,
              alignItems: 'center',
              marginTop: 12,
              opacity: batchSaving ? 0.7 : 1,
            })}
          >
            <Text style={{ fontFamily: fontFamilyBodyBold, fontSize: fontSizeSm, color: white }}>
              {batchSaving && batchProgress
                ? `Saving ${batchProgress.current} of ${batchProgress.total}...`
                : 'Save All as Recipes'}
            </Text>
          </Pressable>
        )}

        {/* Batch failure notice */}
        {batchFailures.length > 0 && (
          <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeXs, color: accentCoral, marginTop: 8 }}>
            {batchFailures.length} draft{batchFailures.length !== 1 ? 's' : ''} failed to save. You can retry or save individually.
          </Text>
        )}

        {progress.allSaved && (
          <Pressable
            onPress={() => router.replace('/scan')}
            accessibilityRole="button"
            accessibilityLabel="Back to scans"
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#16A34A' : accentGreen,
              paddingVertical: 10,
              paddingHorizontal: 20,
              borderRadius: radiusSm,
              alignItems: 'center',
              marginTop: 12,
            })}
          >
            <Text style={{ fontFamily: fontFamilyBodyBold, fontSize: fontSizeSm, color: white }}>
              Back to Scans
            </Text>
          </Pressable>
        )}
      </View>
    );
  };

  // --- Draft Card ---
  const DraftCard = ({ draft, index, isSelected }: { draft: ScanDraft; index: number; isSelected: boolean }) => {
    const displayStatus = getDraftDisplayStatus(draft);
    const statusStyle = getStatusStyle(displayStatus);
    const confidenceColor = getConfidenceColor(draft.overallConfidence.score);
    const title = draft.recipe.title || `Recipe ${(draft.draftIndex ?? index) + 1}`;

    return (
      <Pressable
        onPress={() => {
          setSelectedDraftIndex(index);
          setIsEditing(false);
        }}
        accessibilityRole="button"
        accessibilityLabel={`Review draft: ${title}`}
        accessibilityState={{ selected: isSelected }}
        style={({ pressed }) => ({
          backgroundColor: isSelected ? white : bgCard,
          borderWidth: isSelected ? 2 : 1,
          borderColor: isSelected ? accentBlue : borderDefault,
          borderRadius: radiusMd,
          padding: 14,
          ...shadowSm,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        {/* Title row */}
        <Text
          numberOfLines={1}
          style={{
            fontFamily: fontFamilyBodyBold,
            fontSize: fontSizeBase,
            color: textPrimary,
            marginBottom: 8,
          }}
        >
          {title}
        </Text>

        {/* Badges row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Confidence badge */}
          <View
            style={{
              backgroundColor: confidenceColor.bg,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: radiusPill,
            }}
          >
            <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeXs, color: confidenceColor.text }}>
              {getConfidenceLabel(draft.overallConfidence.score)} ({Math.round(draft.overallConfidence.score * 100)}%)
            </Text>
          </View>

          {/* Status badge */}
          <View
            style={{
              backgroundColor: statusStyle.bg,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: radiusPill,
            }}
          >
            <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeXs, color: statusStyle.text }}>
              {statusStyle.label}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  // --- Draft Card List ---
  const DraftCardList = () => (
    <View style={{ gap: 10 }}>
      <Text style={{ fontFamily: fontFamilyDisplay, fontSize: fontSizeLg, color: textPrimary, marginBottom: 4 }}>
        {drafts.length} Draft{drafts.length !== 1 ? 's' : ''} Found
      </Text>
      {drafts.map((draft, index) => (
        <DraftCard
          key={draft.id}
          draft={draft}
          index={index}
          isSelected={selectedDraftIndex === index}
        />
      ))}
    </View>
  );

  // --- Selected Draft Panel ---
  const SelectedDraftPanel = () => {
    if (!selectedDraft) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 32,
            backgroundColor: bgCard,
            borderRadius: radiusMd,
          }}
        >
          <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeBase, color: textTertiary, textAlign: 'center' }}>
            Select a draft to review
          </Text>
        </View>
      );
    }

    if (isEditing) {
      return (
        <DraftEditor
          draft={selectedDraft}
          onCancel={() => setIsEditing(false)}
          onConverted={handleDraftConverted}
        />
      );
    }

    return (
      <DraftReview
        draft={selectedDraft}
        onEdit={() => setIsEditing(true)}
        onDraftSaved={() => refreshDrafts()}
      />
    );
  };

  // --- Mobile Layout ---
  if (isMobile) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: bgPage }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}
      >
        {/* Shared photos */}
        <PhotoSection />

        {/* Progress */}
        <ProgressSection />

        {/* Draft list */}
        <DraftCardList />

        {/* Selected draft inline below */}
        {selectedDraft && (
          <View style={{ marginTop: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontFamily: fontFamilyDisplay, fontSize: fontSizeLg, color: textPrimary }}>
                Draft Review
              </Text>
              <Pressable
                onPress={() => {
                  setSelectedDraftIndex(null);
                  setIsEditing(false);
                }}
                accessibilityRole="button"
                accessibilityLabel="Close draft review"
              >
                <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeSm, color: accentBlue }}>
                  Close
                </Text>
              </Pressable>
            </View>
            <SelectedDraftPanel />
          </View>
        )}
      </ScrollView>
    );
  }

  // --- Tablet / Web Layout (sidebar + detail) ---
  return (
    <View style={{ flex: 1, backgroundColor: bgPage, flexDirection: 'row' }}>
      {/* Left sidebar — photos, progress, draft list (30%) */}
      <ScrollView
        style={{
          width: '30%',
          borderRightWidth: 1,
          borderRightColor: borderSubtle,
        }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}
      >
        <PhotoSection />
        <ProgressSection />
        <DraftCardList />
      </ScrollView>

      {/* Right panel — selected draft detail (70%) */}
      <View style={{ flex: 1 }}>
        <SelectedDraftPanel />
      </View>
    </View>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

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

// --- Confidence helpers ---

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Batch save state
  const [batchSaving, setBatchSaving] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [batchFailures, setBatchFailures] = useState<string[]>([]);

  const userId = session?.user?.id;

  // Load drafts and photos on mount
  useEffect(() => {
    if (!userId) return;

    let channel: ReturnType<typeof subscribeToJob> | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let pollIntervalId: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const unsubscribe = () => {
      if (channel) { channel.unsubscribe(); channel = null; }
      if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
      if (pollIntervalId) { clearInterval(pollIntervalId); pollIntervalId = null; }
    };

    const loadDrafts = async () => {
      try {
        setLoading(true);
        setError(null);

        const [draftResults, photos] = await Promise.all([
          scanDraftService.getDraftsByJobId(jobId, userId),
          getJobPhotos(jobId).catch(() => [] as string[]),
        ]);

        if (cancelled) return;

        const urls = photos
          .filter((u: string) => !u.startsWith('inline://'))
          .map((photoUrl: string) => {
            if (photoUrl.startsWith('http')) return photoUrl;
            return getScanPhotoUrl(photoUrl);
          });
        setPhotoUrls(urls);

        if (draftResults.length > 0) {
          setDrafts(draftResults);
          setLoading(false);
          return;
        }

        timeoutId = setTimeout(() => {
          unsubscribe();
          if (!cancelled) {
            setError('Processing is taking longer than expected. Please try again.');
            setLoading(false);
          }
        }, 120000);

        channel = subscribeToJob(jobId, async (job) => {
          if (cancelled) return;
          if (job.status === 'completed') {
            unsubscribe();
            try {
              const retryDrafts = await scanDraftService.getDraftsByJobId(jobId, userId);
              if (!cancelled) { setDrafts(retryDrafts); setLoading(false); }
            } catch (err) {
              if (!cancelled) { setError(err instanceof Error ? err.message : 'Failed to load drafts'); setLoading(false); }
            }
          } else if (job.status === 'failed') {
            unsubscribe();
            if (!cancelled) { setError('Scan processing failed. Please try again.'); setLoading(false); }
          }
        });

        pollIntervalId = setInterval(async () => {
          if (cancelled) return;
          try {
            const polledDrafts = await scanDraftService.getDraftsByJobId(jobId, userId);
            if (polledDrafts.length > 0 && !cancelled) {
              unsubscribe();
              setDrafts(polledDrafts);
              setLoading(false);
            }
          } catch { /* ignore */ }
        }, 4000);
      } catch (err) {
        if (!cancelled) { setError(err instanceof Error ? err.message : 'Failed to load drafts'); setLoading(false); }
      }
    };

    loadDrafts();
    return () => { cancelled = true; unsubscribe(); };
  }, [jobId, userId]);

  const refreshDrafts = async () => {
    if (!userId) return;
    try {
      const updated = await scanDraftService.getDraftsByJobId(jobId, userId);
      setDrafts(updated);
      setIsEditing(false);
    } catch { /* ignore */ }
  };

  const handleDraftConverted = (_recipeId: string) => { refreshDrafts(); };

  // Batch save
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
      } catch { failures.push(draft.id); }
    }

    try {
      const updated = await scanDraftService.getDraftsByJobId(jobId, userId);
      setDrafts(updated);
    } catch { /* ignore */ }

    setBatchFailures(failures);
    setBatchSaving(false);
    setBatchProgress(null);
  };

  // --- Computed ---
  const progress = getDraftProgress(drafts);
  const showSaveAll = canSaveAll(drafts);
  const currentDraft = drafts[currentIndex] ?? null;
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < drafts.length - 1;

  // --- Loading ---
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

  // --- Error ---
  if (error) {
    return (
      <View style={{ flex: 1, padding: 16, backgroundColor: bgPage }}>
        <View style={{ backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5', borderRadius: radiusSm, padding: 20 }}>
          <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeLg, color: '#991B1B', marginBottom: 8 }}>
            Error Loading Drafts
          </Text>
          <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeBase, color: '#DC2626' }}>{error}</Text>
        </View>
      </View>
    );
  }

  // --- Progress Bar ---
  const ProgressSection = () => {
    const progressPercent = progress.total > 0 ? (progress.saved / progress.total) * 100 : 0;
    return (
      <View style={{ backgroundColor: bgCard, borderRadius: radiusMd, padding: 16, marginHorizontal: 16, ...shadowSm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeBase, color: textPrimary }}>
            {progress.allSaved ? 'All recipes saved!' : `${progress.saved} of ${progress.total} recipes saved`}
          </Text>
          {progress.allSaved && (
            <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeXs, color: '#166534' }}>✓ Complete</Text>
          )}
        </View>
        <View style={{ height: 8, backgroundColor: borderDefault, borderRadius: 4, overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${progressPercent}%` as any, backgroundColor: progress.allSaved ? accentGreen : accentBlue, borderRadius: 4 }} />
        </View>
        {showSaveAll && !progress.allSaved && (
          <Pressable
            onPress={handleSaveAll}
            disabled={batchSaving}
            style={({ pressed }) => ({
              backgroundColor: batchSaving ? borderDefault : pressed ? '#16A34A' : accentGreen,
              paddingVertical: 10, paddingHorizontal: 20, borderRadius: radiusSm, alignItems: 'center' as const, marginTop: 12, opacity: batchSaving ? 0.7 : 1,
            })}
          >
            <Text style={{ fontFamily: fontFamilyBodyBold, fontSize: fontSizeSm, color: white }}>
              {batchSaving && batchProgress ? `Saving ${batchProgress.current} of ${batchProgress.total}...` : 'Save All as Recipes'}
            </Text>
          </Pressable>
        )}
        {batchFailures.length > 0 && (
          <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeXs, color: accentCoral, marginTop: 8 }}>
            {batchFailures.length} draft{batchFailures.length !== 1 ? 's' : ''} failed to save.
          </Text>
        )}
        {progress.allSaved && (
          <Pressable
            onPress={() => router.replace('/scan')}
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#16A34A' : accentGreen,
              paddingVertical: 10, paddingHorizontal: 20, borderRadius: radiusSm, alignItems: 'center' as const, marginTop: 12,
            })}
          >
            <Text style={{ fontFamily: fontFamilyBodyBold, fontSize: fontSizeSm, color: white }}>Back to Scans</Text>
          </Pressable>
        )}
      </View>
    );
  };

  // --- Mobile Layout ---
  if (isMobile) {
    return (
      <View style={{ flex: 1, backgroundColor: bgPage }}>
        {/* Header + Progress */}
        <View style={{ paddingTop: 16, gap: 12 }}>
          <Text
            style={{
              fontFamily: fontFamilyDisplay,
              fontSize: fontSize2xl,
              color: textPrimary,
              textAlign: 'center',
            }}
          >
            {drafts.length} Recipe{drafts.length !== 1 ? 's' : ''} Found
          </Text>
          <ProgressSection />
        </View>

        {/* Draft navigation */}
        {drafts.length > 1 && (
          <View style={{ marginTop: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 8 }}>
              <Pressable
                onPress={() => { setCurrentIndex(i => Math.max(0, i - 1)); setIsEditing(false); }}
                disabled={!canGoPrev}
                style={{ opacity: canGoPrev ? 1 : 0.25, padding: 8 }}
                hitSlop={8}
              >
                <ChevronLeft size={24} color={accentBlue} />
              </Pressable>

              <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeBase, color: textSecondary }}>
                Recipe {currentIndex + 1} of {drafts.length}
              </Text>

              <Pressable
                onPress={() => { setCurrentIndex(i => Math.min(drafts.length - 1, i + 1)); setIsEditing(false); }}
                disabled={!canGoNext}
                style={{ opacity: canGoNext ? 1 : 0.25, padding: 8 }}
                hitSlop={8}
              >
                <ChevronRight size={24} color={accentBlue} />
              </Pressable>
            </View>

            {/* Dot indicators */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
              {drafts.map((_, i) => (
                <Pressable key={i} onPress={() => { setCurrentIndex(i); setIsEditing(false); }}>
                  <View
                    style={{
                      width: i === currentIndex ? 20 : 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: i === currentIndex ? accentBlue : borderDefault,
                    }}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Draft detail */}
        <View style={{ flex: 1, marginTop: 12 }}>
          {currentDraft && (
            isEditing ? (
              <DraftEditor
                draft={currentDraft}
                onCancel={() => setIsEditing(false)}
                onConverted={handleDraftConverted}
              />
            ) : (
              <DraftReview
                draft={currentDraft}
                onEdit={() => setIsEditing(true)}
                onDraftSaved={() => refreshDrafts()}
              />
            )
          )}
        </View>
      </View>
    );
  }

  // --- Tablet / Web Layout (sidebar + detail) ---
  return (
    <View style={{ flex: 1, backgroundColor: bgPage, flexDirection: 'row', overflow: 'hidden' as any }}>
      {/* Left sidebar — progress, draft list */}
      <ScrollView
        style={{
          width: 300,
          minWidth: 260,
          maxWidth: 340,
          flexShrink: 0,
          borderRightWidth: 1,
          borderRightColor: borderSubtle,
          backgroundColor: bgCard,
        }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}
      >
        <Text style={{ fontFamily: fontFamilyDisplay, fontSize: fontSizeLg, color: textPrimary }}>
          {drafts.length} Recipe{drafts.length !== 1 ? 's' : ''} Found
        </Text>

        {/* Inline progress (no ProgressSection — avoid double margin) */}
        {(() => {
          const progressPercent = progress.total > 0 ? (progress.saved / progress.total) * 100 : 0;
          return (
            <View style={{ backgroundColor: white, borderRadius: radiusMd, padding: 14, ...shadowSm }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeSm, color: textPrimary }}>
                  {progress.allSaved ? 'All saved!' : `${progress.saved}/${progress.total} saved`}
                </Text>
                {progress.allSaved && (
                  <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeXs, color: '#166534' }}>✓</Text>
                )}
              </View>
              <View style={{ height: 6, backgroundColor: borderDefault, borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${progressPercent}%` as any, backgroundColor: progress.allSaved ? accentGreen : accentBlue, borderRadius: 3 }} />
              </View>
              {showSaveAll && !progress.allSaved && (
                <Pressable
                  onPress={handleSaveAll}
                  disabled={batchSaving}
                  style={({ pressed }) => ({
                    backgroundColor: batchSaving ? borderDefault : pressed ? '#16A34A' : accentGreen,
                    paddingVertical: 8, paddingHorizontal: 14, borderRadius: radiusSm, alignItems: 'center' as const, marginTop: 10, opacity: batchSaving ? 0.7 : 1,
                  })}
                >
                  <Text style={{ fontFamily: fontFamilyBodyBold, fontSize: fontSizeXs, color: white }}>
                    {batchSaving && batchProgress ? `Saving ${batchProgress.current}/${batchProgress.total}...` : 'Save All'}
                  </Text>
                </Pressable>
              )}
              {batchFailures.length > 0 && (
                <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeXs, color: accentCoral, marginTop: 6 }}>
                  {batchFailures.length} failed
                </Text>
              )}
              {progress.allSaved && (
                <Pressable
                  onPress={() => router.replace('/scan')}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? '#16A34A' : accentGreen,
                    paddingVertical: 8, paddingHorizontal: 14, borderRadius: radiusSm, alignItems: 'center' as const, marginTop: 10,
                  })}
                >
                  <Text style={{ fontFamily: fontFamilyBodyBold, fontSize: fontSizeXs, color: white }}>Back to Scans</Text>
                </Pressable>
              )}
            </View>
          );
        })()}

        {/* Draft cards */}
        <View style={{ gap: 8 }}>
          {drafts.map((draft, index) => {
            const displayStatus = getDraftDisplayStatus(draft);
            const statusStyle = getStatusStyle(displayStatus);
            const confidenceColor = getConfidenceColor(draft.overallConfidence.score);
            const title = draft.recipe.title || `Recipe ${(draft.draftIndex ?? index) + 1}`;
            const isSelected = currentIndex === index;
            const ingredientCount = draft.recipe.ingredients?.length ?? 0;
            return (
              <Pressable
                key={draft.id}
                onPress={() => { setCurrentIndex(index); setIsEditing(false); }}
                style={({ pressed }) => ({
                  backgroundColor: isSelected ? white : bgPage,
                  borderWidth: isSelected ? 2 : 1,
                  borderColor: isSelected ? accentBlue : borderDefault,
                  borderRadius: radiusSm,
                  padding: 12,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text numberOfLines={1} style={{ fontFamily: fontFamilyBodyBold, fontSize: fontSizeSm, color: textPrimary, marginBottom: 4 }}>
                  {title}
                </Text>
                <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeXs, color: textTertiary, marginBottom: 6 }}>
                  {ingredientCount} ingredient{ingredientCount !== 1 ? 's' : ''}
                </Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <View style={{ backgroundColor: statusStyle.bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radiusPill }}>
                    <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeXs, color: statusStyle.text }}>{statusStyle.label}</Text>
                  </View>
                  <View style={{ backgroundColor: confidenceColor.bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radiusPill }}>
                    <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeXs, color: confidenceColor.text }}>
                      {Math.round(draft.overallConfidence.score * 100)}%
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Right panel — detail */}
      <View style={{ flex: 1, minWidth: 0 }}>
        {currentDraft ? (
          isEditing ? (
            <DraftEditor draft={currentDraft} onCancel={() => setIsEditing(false)} onConverted={handleDraftConverted} />
          ) : (
            <DraftReview draft={currentDraft} onEdit={() => setIsEditing(true)} onDraftSaved={() => refreshDrafts()} />
          )
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
            <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeBase, color: textTertiary, textAlign: 'center' }}>
              Select a draft to review
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

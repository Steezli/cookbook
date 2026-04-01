import React, { useState, useEffect } from 'react';
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
import { getScanPhotoUrl } from '@/features/scan/scan-photos';
import { useSession } from '@/features/auth/session';
import { useBreakpoint } from '@/lib/hooks/useBreakpoint';
import { DraftReview } from './DraftReview';
import { DraftEditor } from './DraftEditor';
import {
  fontFamilyDisplay,
  fontFamilyDisplayBold,
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
  noPhotoBg,
  badgeGreenBg,
  badgeYellowBg,
} from '@/lib/tokens';

interface DraftListViewProps {
  jobId: string;
}

const getConfidenceStyle = (confidence: number) => {
  if (confidence >= 0.85) return { bg: badgeGreenBg, text: '#166534' };
  if (confidence >= 0.65) return { bg: badgeYellowBg, text: '#854D0E' };
  return { bg: '#FEF2F2', text: '#991B1B' };
};

export function DraftListView({ jobId }: DraftListViewProps) {
  const { session } = useSession();
  const { breakpoint } = useBreakpoint();
  const isMobile = breakpoint === 'mobile';

  const [drafts, setDrafts] = useState<ScanDraft[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedDraftIds, setSavedDraftIds] = useState<Set<string>>(new Set());
  const [initialTotal, setInitialTotal] = useState<number | null>(null);

  // Batch state
  const [batchSaving, setBatchSaving] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  const userId = session?.user?.id;

  // Load drafts on mount
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
        setPhotoUrls(photos.filter((u: string) => !u.startsWith('inline://')).map((u: string) => u.startsWith('http') ? u : getScanPhotoUrl(u)));
        if (draftResults.length > 0) { setDrafts(draftResults); setInitialTotal(t => t ?? draftResults.length); setLoading(false); return; }

        timeoutId = setTimeout(() => { unsubscribe(); if (!cancelled) { setError('Processing is taking longer than expected.'); setLoading(false); } }, 120000);

        channel = subscribeToJob(jobId, async (job) => {
          if (cancelled) return;
          if (job.status === 'completed') {
            unsubscribe();
            try { const r = await scanDraftService.getDraftsByJobId(jobId, userId); if (!cancelled) { setDrafts(r); setInitialTotal(t => t ?? r.length); setLoading(false); } }
            catch (err) { if (!cancelled) { setError(err instanceof Error ? err.message : 'Failed'); setLoading(false); } }
          } else if (job.status === 'failed') { unsubscribe(); if (!cancelled) { setError('Scan processing failed.'); setLoading(false); } }
        });

        pollIntervalId = setInterval(async () => {
          if (cancelled) return;
          try { const p = await scanDraftService.getDraftsByJobId(jobId, userId); if (p.length > 0 && !cancelled) { unsubscribe(); setDrafts(p); setInitialTotal(t => t ?? p.length); setLoading(false); } } catch {}
        }, 4000);
      } catch (err) { if (!cancelled) { setError(err instanceof Error ? err.message : 'Failed'); setLoading(false); } }
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
      setCurrentIndex(i => Math.min(i, Math.max(0, updated.length - 1)));
    } catch {}
  };

  const handleDraftConverted = (recipeId: string, draftId?: string) => {
    if (draftId) setSavedDraftIds(prev => new Set(prev).add(draftId));
    refreshDrafts();
  };

  // Batch save
  const handleSaveAll = async () => {
    if (!userId || batchSaving) return;
    const unsaved = drafts.filter(d => !savedDraftIds.has(d.id));
    if (unsaved.length === 0) return;
    setBatchSaving(true);
    setBatchProgress({ current: 0, total: unsaved.length });
    for (let i = 0; i < unsaved.length; i++) {
      setBatchProgress({ current: i + 1, total: unsaved.length });
      try {
        await scanDraftService.convertToRecipe(unsaved[i].id, userId, {
          title: unsaved[i].recipe.title || `Recipe ${i + 1}`,
          ingredients: unsaved[i].recipe.ingredients || [],
          instructions: unsaved[i].recipe.instructions || [],
          prepTimeMinutes: unsaved[i].recipe.prepTimeMinutes,
          cookTimeMinutes: unsaved[i].recipe.cookTimeMinutes,
          servings: unsaved[i].recipe.servings,
          tags: [],
        });
        setSavedDraftIds(prev => new Set(prev).add(unsaved[i].id));
      } catch {}
    }
    setBatchSaving(false);
    setBatchProgress(null);
    refreshDrafts();
  };

  // Computed — derive progress from DB state, not ephemeral counters.
  // initialTotal is set once on first load; saved = initialTotal - remaining drafts.
  const total = initialTotal ?? drafts.length;
  const saved = Math.max(0, total - drafts.length);
  const currentDraft = drafts[currentIndex] ?? null;
  const allSaved = total > 0 && drafts.length === 0;

  // --- Loading / Error ---
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bgPage }}>
        <ActivityIndicator size="large" color={accentBlue} />
        <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeSm, color: textSecondary, marginTop: 12 }}>Loading drafts...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, padding: 16, backgroundColor: bgPage }}>
        <View style={{ backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5', borderRadius: radiusSm, padding: 20 }}>
          <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeLg, color: '#991B1B', marginBottom: 8 }}>Error</Text>
          <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeBase, color: '#DC2626' }}>{error}</Text>
        </View>
      </View>
    );
  }

  // --- Progress bar ---
  const ProgressBar = () => {
    const pct = total > 0 ? (saved / total) * 100 : 0;
    return (
      <View style={{ backgroundColor: bgCard, borderRadius: radiusMd, padding: 16, gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeBase, color: textPrimary }}>
            {allSaved ? 'All recipes saved!' : `${saved} of ${total} recipes saved`}
          </Text>
          {allSaved && <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeXs, color: '#166534' }}>✓ Complete</Text>}
        </View>
        <View style={{ height: 8, backgroundColor: borderDefault, borderRadius: 4, overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${pct}%` as any, backgroundColor: allSaved ? accentGreen : accentBlue, borderRadius: 4 }} />
        </View>
        {allSaved && (
          <Pressable onPress={() => router.replace('/scan')} style={({ pressed }) => ({ backgroundColor: pressed ? '#16A34A' : accentGreen, paddingVertical: 10, borderRadius: radiusSm, alignItems: 'center' as const, marginTop: 4 })}>
            <Text style={{ fontFamily: fontFamilyBodyBold, fontSize: fontSizeSm, color: white }}>Back to Scanner</Text>
          </Pressable>
        )}
      </View>
    );
  };

  // =========================================================================
  // MOBILE — Card list view (Screen 4 design)
  // =========================================================================

  if (isMobile) {
    // If viewing a specific draft's detail
    if (currentIndex >= 0 && currentDraft && (isEditing || drafts.length === 1)) {
      if (isEditing) {
        return (
          <DraftEditor draft={currentDraft} onCancel={() => setIsEditing(false)} onConverted={(id) => handleDraftConverted(id, currentDraft.id)} />
        );
      }
      return (
        <View style={{ flex: 1 }}>
          <DraftReview draft={currentDraft} onEdit={() => setIsEditing(true)} onDraftSaved={() => { setSavedDraftIds(prev => new Set(prev).add(currentDraft.id)); refreshDrafts(); }} onDiscarded={() => refreshDrafts()} />
        </View>
      );
    }

    // Card list
    return (
      <View style={{ flex: 1, backgroundColor: bgPage }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}>
          {/* Header */}
          <Text style={{ fontFamily: fontFamilyDisplayBold, fontSize: fontSize2xl, color: textPrimary, textAlign: 'center' }}>
            {drafts.length} Recipe{drafts.length !== 1 ? 's' : ''} Found
          </Text>

          <ProgressBar />

          {/* Draft cards */}
          {drafts.map((draft, index) => {
            const isSaved = savedDraftIds.has(draft.id);
            const confidence = Math.round(draft.overallConfidence.score * 100);
            const confStyle = getConfidenceStyle(draft.overallConfidence.score);
            const title = draft.recipe.title || `Recipe ${(draft.draftIndex ?? index) + 1}`;
            const ingredientCount = draft.recipe.ingredients?.length ?? 0;
            const stepCount = draft.recipe.instructions?.length ?? 0;

            return (
              <View key={draft.id} style={{ backgroundColor: bgCard, borderRadius: 14, padding: 16, gap: 10 }}>
                {/* Title + confidence */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text numberOfLines={1} style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeBase, color: textPrimary, flex: 1, marginRight: 8 }}>
                    {title}
                  </Text>
                  <View style={{ backgroundColor: confStyle.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radiusPill }}>
                    <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeXs, color: confStyle.text }}>{confidence}%</Text>
                  </View>
                </View>

                {/* Meta */}
                <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeXs, color: textSecondary }}>
                  {draft.recipe.category || 'Recipe'} · {ingredientCount} ingredients · {stepCount} steps
                </Text>

                {/* Action row */}
                {isSaved ? (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ backgroundColor: badgeGreenBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radiusPill }}>
                        <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeXs, color: '#166534' }}>✓ Saved</Text>
                      </View>
                    </View>
                    <Pressable onPress={() => { /* TODO: navigate to recipe */ }}>
                      <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeSm, color: accentBlue }}>View Recipe →</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => { setCurrentIndex(index); }}
                    style={{ backgroundColor: accentBlue, paddingVertical: 10, borderRadius: 8, alignItems: 'center' }}
                  >
                    <Text style={{ fontFamily: fontFamilyBodyBold, fontSize: fontSizeSm, color: white }}>Review & Save</Text>
                  </Pressable>
                )}
              </View>
            );
          })}

          {/* Save All button */}
          {!allSaved && drafts.length > 1 && (
            <Pressable
              onPress={handleSaveAll}
              disabled={batchSaving}
              style={({ pressed }) => ({
                backgroundColor: batchSaving ? borderDefault : pressed ? '#16A34A' : accentGreen,
                paddingVertical: 14, borderRadius: radiusMd, alignItems: 'center' as const, opacity: batchSaving ? 0.7 : 1,
              })}
            >
              <Text style={{ fontFamily: fontFamilyBodyBold, fontSize: fontSizeBase, color: white }}>
                {batchSaving && batchProgress ? `Saving ${batchProgress.current} of ${batchProgress.total}...` : 'Save All as Recipes'}
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </View>
    );
  }

  // =========================================================================
  // WEB / TABLET — Two-panel: recipe content left, card sidebar right
  // =========================================================================

  return (
    <View style={{ flex: 1, backgroundColor: bgPage, flexDirection: 'row' }}>
      {/* LEFT: Recipe detail */}
      <View style={{ flex: 1, minWidth: 0 }}>
        {currentDraft && (
          isEditing ? (
            <DraftEditor draft={currentDraft} onCancel={() => setIsEditing(false)} onConverted={(id) => handleDraftConverted(id, currentDraft.id)} />
          ) : (
            <DraftReview draft={currentDraft} onEdit={() => setIsEditing(true)} onDraftSaved={() => { setSavedDraftIds(prev => new Set(prev).add(currentDraft.id)); refreshDrafts(); }} onDiscarded={() => refreshDrafts()} />
          )
        )}
      </View>

      {/* RIGHT: Draft card sidebar */}
      <ScrollView
        style={{ width: 320, maxWidth: 320, flexShrink: 0, borderLeftWidth: 1, borderLeftColor: borderSubtle, backgroundColor: bgCard }}
        contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }}
      >
        <Text style={{ fontFamily: fontFamilyDisplayBold, fontSize: fontSizeXl, color: textPrimary }}>
          {drafts.length} Recipe{drafts.length !== 1 ? 's' : ''} Found
        </Text>

        <ProgressBar />

        {/* Draft cards */}
        {drafts.map((draft, index) => {
          const isSelected = currentIndex === index;
          const isSaved = savedDraftIds.has(draft.id);
          const confidence = Math.round(draft.overallConfidence.score * 100);
          const confStyle = getConfidenceStyle(draft.overallConfidence.score);
          const title = draft.recipe.title || `Recipe ${(draft.draftIndex ?? index) + 1}`;

          return (
            <Pressable
              key={draft.id}
              onPress={() => { setCurrentIndex(index); setIsEditing(false); }}
              style={({ pressed }) => ({
                backgroundColor: isSelected ? white : 'transparent',
                borderWidth: isSelected ? 2 : 1,
                borderColor: isSelected ? accentBlue : borderDefault,
                borderRadius: 14,
                padding: 14,
                gap: 8,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text numberOfLines={1} style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeSm, color: textPrimary, flex: 1, marginRight: 8 }}>{title}</Text>
                <View style={{ backgroundColor: confStyle.bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radiusPill }}>
                  <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeXs, color: confStyle.text }}>{confidence}%</Text>
                </View>
              </View>
              <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeXs, color: textTertiary }}>
                {draft.recipe.ingredients?.length ?? 0} ingredients · {draft.recipe.instructions?.length ?? 0} steps
              </Text>
              {isSaved ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ backgroundColor: badgeGreenBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radiusPill }}>
                    <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeXs, color: '#166534' }}>✓ Saved</Text>
                  </View>
                </View>
              ) : (
                <Pressable onPress={() => { setCurrentIndex(index); }} style={{ backgroundColor: accentBlue, paddingVertical: 8, borderRadius: 8, alignItems: 'center' }}>
                  <Text style={{ fontFamily: fontFamilyBodyBold, fontSize: fontSizeXs, color: white }}>Review & Save</Text>
                </Pressable>
              )}
            </Pressable>
          );
        })}

        {!allSaved && drafts.length > 1 && (
          <Pressable onPress={handleSaveAll} disabled={batchSaving} style={({ pressed }) => ({
            backgroundColor: batchSaving ? borderDefault : pressed ? '#16A34A' : accentGreen,
            paddingVertical: 12, borderRadius: radiusSm, alignItems: 'center' as const,
          })}>
            <Text style={{ fontFamily: fontFamilyBodyBold, fontSize: fontSizeSm, color: white }}>
              {batchSaving && batchProgress ? `Saving ${batchProgress.current}/${batchProgress.total}...` : 'Save All'}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

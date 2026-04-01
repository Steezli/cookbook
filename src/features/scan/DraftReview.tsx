import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Animated,
  Pressable,
  ActivityIndicator,
  Platform,
  Modal,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { ScanDraft, scanDraftService } from '@/lib/scan/scan-draft-service';
import { ParsedRecipe, FieldConfidence } from '@/features/scan/types';
import { getJobPhotos, subscribeToJob } from '@/features/scan/scan-service';
import { getScanPhotoUrl, getScanThumbnailUrl } from '@/features/scan/scan-photos';
import { useSession } from '@/features/auth/session';
import { useBreakpoint } from '@/lib/hooks/useBreakpoint';
import {
  fontFamilyDisplay,
  fontFamilyDisplayBold,
  fontFamilyBody,
  fontFamilyBodyMedium,
  fontFamilyBodyBold,
  fontSize2xl,
  fontSize3xl,
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
} from '@/lib/tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DraftReviewProps {
  draft?: ScanDraft;
  draftId?: string;
  onDraftUpdated?: (draft: ScanDraft) => void;
  onDraftSaved?: (draft: ScanDraft) => void;
  onEdit?: () => void;
  onDiscarded?: () => void;
}

type ContentTab = 'ingredients' | 'instructions' | 'notes';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getConfidenceColor = (confidence: number): { bg: string; text: string } => {
  if (confidence >= 0.85) return { bg: '#DCFCE7', text: '#166534' };
  if (confidence >= 0.65) return { bg: '#FEF9C3', text: '#854D0E' };
  return { bg: '#FEF2F2', text: '#991B1B' };
};

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const color = getConfidenceColor(confidence);
  return (
    <View style={{ backgroundColor: color.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radiusPill }}>
      <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeXs, color: color.text }}>
        {Math.round(confidence * 100)}% confidence
      </Text>
    </View>
  );
}

function formatTime(minutes?: number): string {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

function getTotalTime(recipe: ParsedRecipe): string {
  const total = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);
  return total > 0 ? formatTime(total) : '';
}

// ---------------------------------------------------------------------------
// DraftReview — Option B: Immersive photo-forward with tabbed content
// ---------------------------------------------------------------------------

export function DraftReview({ draft: draftProp, draftId, onDraftUpdated, onDraftSaved, onEdit, onDiscarded }: DraftReviewProps) {
  const { session, isLoading: authLoading } = useSession();
  const { breakpoint } = useBreakpoint();
  const isMobile = breakpoint === 'mobile';
  const isWeb = breakpoint === 'web' || breakpoint === 'tablet';

  const [draft, setDraft] = useState<ScanDraft | null>(draftProp ?? null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [loading, setLoading] = useState(!draftProp);
  const [jobStatus, setJobStatus] = useState<string>(draftProp ? 'completed' : 'checking');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ContentTab>('ingredients');
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [discarding, setDiscarding] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;

  const jobId = draftProp?.jobId ?? draftId;

  // --- Data loading (unchanged logic) ---

  useEffect(() => {
    if (!draftProp) return;
    setDraft(draftProp);
    setLoading(false);
    setJobStatus('completed');

    const loadPhotos = async () => {
      try {
        const photos = await getJobPhotos(draftProp.jobId);
        const urls = photos.map((u: string) => u.startsWith('http') ? u : getScanPhotoUrl(u));
        setPhotoUrls(urls);
      } catch { /* non-critical */ }
    };
    loadPhotos();
  }, [draftProp]);

  useEffect(() => {
    if (draftProp) return;
    if (!draftId || !session?.user?.id) return;

    let channel: ReturnType<typeof subscribeToJob> | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let pollIntervalId: ReturnType<typeof setInterval> | null = null;

    const loadPhotos = async (resolvedJobId: string) => {
      try {
        const photos = await getJobPhotos(resolvedJobId);
        const urls = photos.map((u: string) => u.startsWith('http') ? u : getScanPhotoUrl(u));
        setPhotoUrls(urls);
      } catch { /* non-critical */ }
    };

    const finalizeDraft = async (d: ScanDraft) => {
      setDraft(d);
      onDraftUpdated?.(d);
      await loadPhotos(d.jobId);
      setLoading(false);
    };

    const unsubscribe = () => {
      if (channel) { channel.unsubscribe(); channel = null; }
      if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
      if (pollIntervalId) { clearInterval(pollIntervalId); pollIntervalId = null; }
    };

    const loadDraft = async () => {
      try {
        setLoading(true);
        setJobStatus('checking');
        const userId = session!.user.id;
        const d = await scanDraftService.getDraftByJobId(draftId, userId);
        if (d) { setJobStatus('completed'); await finalizeDraft(d); return; }

        setJobStatus('processing');
        timeoutId = setTimeout(() => { unsubscribe(); setError('Processing is taking longer than expected.'); setLoading(false); }, 60000);

        channel = subscribeToJob(draftId, async (job) => {
          if (job.status === 'completed') {
            unsubscribe();
            try {
              const retry = await scanDraftService.getDraftByJobId(draftId, userId);
              if (retry) { setJobStatus('completed'); await finalizeDraft(retry); }
              else { setError('Draft not found after processing.'); setLoading(false); }
            } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load draft'); setLoading(false); }
          } else if (job.status === 'failed') {
            unsubscribe(); setError('Scan processing failed.'); setLoading(false);
          }
        });

        pollIntervalId = setInterval(async () => {
          try {
            const polled = await scanDraftService.getDraftByJobId(draftId, userId);
            if (polled) { unsubscribe(); setJobStatus('completed'); await finalizeDraft(polled); }
          } catch { /* ignore */ }
        }, 4000);
      } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load draft'); setLoading(false); }
    };

    loadDraft();
    return () => { unsubscribe(); };
  }, [draftProp, draftId, session, onDraftUpdated]);

  // --- Discard handler ---

  const handleDiscard = async () => {
    if (!draft || !session?.user?.id) return;
    try {
      setDiscarding(true);
      await scanDraftService.deleteDraft(draft.id, session.user.id);
      setShowDiscardDialog(false);
      if (onDiscarded) onDiscarded();
      else router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to discard draft');
      setDiscarding(false);
    }
  };

  // --- Loading / Error states ---

  if (authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bgPage }}>
        <ActivityIndicator size="large" color={accentBlue} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={{ flex: 1, padding: 16, backgroundColor: bgPage }}>
        <View style={{ backgroundColor: '#FEFCE8', borderWidth: 1, borderColor: '#FDE68A', borderRadius: radiusSm, padding: 20 }}>
          <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeLg, color: '#92400E', marginBottom: 8 }}>Authentication Required</Text>
          <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeBase, color: '#A16207' }}>Please log in to review drafts</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bgPage }}>
        <ActivityIndicator size="large" color={accentBlue} />
        <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeSm, color: textSecondary, marginTop: 12 }}>
          {jobStatus === 'processing' ? 'Processing your scan...' : 'Loading draft...'}
        </Text>
      </View>
    );
  }

  if (error || !draft) {
    return (
      <View style={{ flex: 1, padding: 16, backgroundColor: bgPage }}>
        <View style={{ backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5', borderRadius: radiusSm, padding: 20 }}>
          <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeLg, color: '#991B1B', marginBottom: 8 }}>Error Loading Draft</Text>
          <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeBase, color: '#DC2626' }}>{error || 'Draft not found'}</Text>
        </View>
      </View>
    );
  }

  const recipe = draft.recipe;
  const fieldConfidence = draft.fieldConfidence;
  const totalTime = getTotalTime(recipe);
  const ingredientCount = recipe.ingredients?.length || 0;
  const instructionCount = recipe.instructions?.length || 0;

  // --- Shared Sub-components ---

  const TabBar = () => {
    const tabs: { key: ContentTab; label: string; count?: number }[] = [
      { key: 'ingredients', label: 'Ingredients', count: ingredientCount },
      { key: 'instructions', label: 'Instructions', count: instructionCount },
      { key: 'notes', label: 'Notes' },
    ];

    return (
      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: borderDefault }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 12,
                borderBottomWidth: 2,
                borderBottomColor: isActive ? accentBlue : 'transparent',
              }}
            >
              <Text style={{
                fontFamily: isActive ? fontFamilyBodyBold : fontFamilyBodyMedium,
                fontSize: fontSizeSm,
                color: isActive ? accentBlue : textTertiary,
              }}>
                {tab.label}{tab.count !== undefined ? ` (${tab.count})` : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  };

  const TabContent = () => {
    if (activeTab === 'ingredients') {
      if (!recipe.ingredients || recipe.ingredients.length === 0) {
        return (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeSm, color: textTertiary }}>No ingredients detected</Text>
          </View>
        );
      }
      return (
        <View style={{ gap: 0 }}>
          {recipe.ingredients.map((ing, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: isMobile ? 16 : 24, borderBottomWidth: i < recipe.ingredients!.length - 1 ? 1 : 0, borderBottomColor: borderSubtle }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: accentWarm, flexShrink: 0 }} />
              <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeBase, color: textPrimary, flex: 1 }}>
                {ing.amount && `${ing.amount} `}{ing.unit && `${ing.unit} `}{ing.name}{ing.preparation && `, ${ing.preparation}`}
              </Text>
            </View>
          ))}
        </View>
      );
    }

    if (activeTab === 'instructions') {
      if (!recipe.instructions || recipe.instructions.length === 0) {
        return (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeSm, color: textTertiary }}>No instructions detected</Text>
          </View>
        );
      }
      return (
        <View style={{ gap: 0 }}>
          {recipe.instructions.map((step, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, paddingHorizontal: isMobile ? 16 : 24, borderBottomWidth: i < recipe.instructions!.length - 1 ? 1 : 0, borderBottomColor: borderSubtle }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: accentBlue, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <Text style={{ fontFamily: fontFamilyBodyBold, fontSize: fontSizeXs, color: white }}>{i + 1}</Text>
              </View>
              <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeBase, color: textPrimary, flex: 1, lineHeight: 24 }}>{step}</Text>
            </View>
          ))}
        </View>
      );
    }

    // Notes tab
    return (
      <View style={{ padding: isMobile ? 16 : 24, gap: 12 }}>
        {recipe.category && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeSm, color: textSecondary }}>Category</Text>
            <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeSm, color: textPrimary }}>{recipe.category}</Text>
          </View>
        )}
        {recipe.cuisine && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeSm, color: textSecondary }}>Cuisine</Text>
            <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeSm, color: textPrimary }}>{recipe.cuisine}</Text>
          </View>
        )}
        {recipe.prepTimeMinutes && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeSm, color: textSecondary }}>Prep Time</Text>
            <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeSm, color: textPrimary }}>{formatTime(recipe.prepTimeMinutes)}</Text>
          </View>
        )}
        {recipe.cookTimeMinutes && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeSm, color: textSecondary }}>Cook Time</Text>
            <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeSm, color: textPrimary }}>{formatTime(recipe.cookTimeMinutes)}</Text>
          </View>
        )}
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeSm, color: textSecondary, marginBottom: 6 }}>Raw Extracted Text</Text>
          <View style={{ backgroundColor: bgCard, borderRadius: radiusSm, padding: 12 }}>
            <Text style={{ fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier', fontSize: fontSizeXs, color: textSecondary, lineHeight: 18 }}>
              {draft.rawText}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const StickyActionBar = () => (
    <View style={{
      flexDirection: 'row',
      gap: 10,
      paddingVertical: 14,
      paddingHorizontal: isMobile ? 16 : 24,
      backgroundColor: bgPage,
      borderTopWidth: 1,
      borderTopColor: borderDefault,
    }}>
      <Pressable
        onPress={onEdit}
        style={({ pressed }) => ({
          flex: 1,
          height: 46,
          backgroundColor: pressed ? '#D4652F' : accentWarm,
          borderRadius: radiusSm,
          alignItems: 'center',
          justifyContent: 'center',
        })}
      >
        <Text style={{ fontFamily: fontFamilyBodyBold, fontSize: fontSizeSm, color: white }}>Save Recipe</Text>
      </Pressable>
      <Pressable
        onPress={onEdit}
        style={({ pressed }) => ({
          height: 46,
          paddingHorizontal: 20,
          backgroundColor: pressed ? borderDefault : bgCard,
          borderRadius: radiusSm,
          borderWidth: 1,
          borderColor: borderDefault,
          alignItems: 'center',
          justifyContent: 'center',
        })}
      >
        <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeSm, color: textPrimary }}>Edit</Text>
      </Pressable>
      <Pressable
        onPress={() => setShowDiscardDialog(true)}
        style={({ pressed }) => ({
          height: 46,
          paddingHorizontal: 20,
          borderRadius: radiusSm,
          borderWidth: 1,
          borderColor: accentCoral,
          backgroundColor: pressed ? '#FEF2F2' : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        })}
      >
        <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeSm, color: accentCoral }}>Discard</Text>
      </Pressable>
    </View>
  );

  const PhotoPagination = () => {
    if (photoUrls.length <= 1) return null;
    return (
      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', paddingTop: 12 }}>
        {photoUrls.map((_, i) => (
          <Pressable key={i} onPress={() => setActivePhotoIndex(i)}>
            <View style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: i === activePhotoIndex ? accentBlue : borderDefault,
            }} />
          </Pressable>
        ))}
      </View>
    );
  };

  const DiscardDialog = () => (
    <Modal visible={showDiscardDialog} transparent animationType="fade" onRequestClose={() => setShowDiscardDialog(false)}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setShowDiscardDialog(false)}>
        <Pressable style={{ backgroundColor: white, borderRadius: radiusMd, padding: 24, maxWidth: 360, width: '90%', ...shadowMd }} onPress={() => {}}>
          <Text style={{ fontFamily: fontFamilyBodyBold, fontSize: fontSizeLg, color: textPrimary, marginBottom: 8 }}>Discard Draft?</Text>
          <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeBase, color: textSecondary, marginBottom: 8 }}>This will permanently delete this draft.</Text>
          {draft && <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeSm, color: textTertiary, marginBottom: 16 }}>"{draft.recipe.title || 'Untitled'}"</Text>}
          <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'flex-end' }}>
            <Pressable onPress={() => setShowDiscardDialog(false)} disabled={discarding} style={({ pressed }) => ({ backgroundColor: pressed ? borderDefault : 'transparent', borderWidth: 1, borderColor: borderDefault, paddingVertical: 10, paddingHorizontal: 20, borderRadius: radiusSm })}>
              <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeBase, color: textPrimary }}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleDiscard} disabled={discarding} style={({ pressed }) => ({ backgroundColor: pressed ? '#DC2626' : accentCoral, paddingVertical: 10, paddingHorizontal: 20, borderRadius: radiusSm, opacity: discarding ? 0.6 : 1 })}>
              <Text style={{ fontFamily: fontFamilyBodyBold, fontSize: fontSizeBase, color: white }}>{discarding ? 'Discarding...' : 'Discard'}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );

  // =========================================================================
  // MOBILE LAYOUT — Hero photo + metadata bar + tabbed content + sticky bar
  // =========================================================================

  if (isMobile) {
    const photoHeight = scrollY.interpolate({
      inputRange: [0, 200],
      outputRange: [280, 80],
      extrapolate: 'clamp',
    });

    return (
      <>
        <View style={{ flex: 1, backgroundColor: bgPage }}>
          {/* Hero photo */}
          <Animated.View style={{ height: photoHeight, overflow: 'hidden' }}>
            {photoUrls.length > 0 ? (
              <Image source={{ uri: photoUrls[activePhotoIndex] }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <View style={{ width: '100%', height: '100%', backgroundColor: noPhotoBg, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeSm, color: noPhotoIcon }}>No photo available</Text>
              </View>
            )}
          </Animated.View>

          {/* Content */}
          <Animated.ScrollView
            style={{ flex: 1 }}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
            scrollEventThrottle={16}
          >
            {/* Metadata bar */}
            <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, gap: 8 }}>
              {/* Back link */}
              <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeSm, color: accentBlue }}>← Back to Scanner</Text>
              </Pressable>

              {/* Title */}
              <Text style={{ fontFamily: fontFamilyDisplayBold, fontSize: fontSize2xl, color: textPrimary }}>
                {recipe.title || 'Untitled Recipe'}
              </Text>

              {/* Meta row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {recipe.category && <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeSm, color: textSecondary }}>{recipe.category}</Text>}
                {recipe.servings && (
                  <>
                    <Text style={{ fontSize: fontSizeSm, color: textTertiary }}>·</Text>
                    <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeSm, color: textSecondary }}>{recipe.servings} servings</Text>
                  </>
                )}
                {totalTime && (
                  <>
                    <Text style={{ fontSize: fontSizeSm, color: textTertiary }}>·</Text>
                    <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeSm, color: textSecondary }}>{totalTime}</Text>
                  </>
                )}
              </View>

              {/* Confidence + photo pagination */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <ConfidenceBadge confidence={draft.overallConfidence.score} />
                <PhotoPagination />
              </View>
            </View>

            {/* Tabs */}
            <TabBar />

            {/* Tab content */}
            <TabContent />

            {/* Bottom padding */}
            <View style={{ height: 24 }} />
          </Animated.ScrollView>

          {/* Sticky bottom action bar */}
          <StickyActionBar />
        </View>
        <DiscardDialog />
      </>
    );
  }

  // =========================================================================
  // WEB / TABLET — Side-by-side: photo viewer left, recipe panel right
  // =========================================================================

  return (
    <>
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: bgPage }}>
        {/* LEFT: Photo viewer */}
        <View style={{ flex: 1, backgroundColor: noPhotoBg, justifyContent: 'center', alignItems: 'center' }}>
          {photoUrls.length > 0 ? (
            <View style={{ flex: 1, width: '100%' }}>
              <Image source={{ uri: photoUrls[activePhotoIndex] }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
              <View style={{ position: 'absolute', bottom: 20, left: 0, right: 0, alignItems: 'center' }}>
                <PhotoPagination />
              </View>
            </View>
          ) : (
            <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeLg, color: noPhotoIcon }}>Recipe Photo</Text>
          )}
        </View>

        {/* RIGHT: Recipe panel */}
        <View style={{ width: 480, borderLeftWidth: 1, borderLeftColor: borderDefault, backgroundColor: bgPage }}>
          {/* Header */}
          <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16, gap: 8 }}>
            <Pressable onPress={() => router.back()}>
              <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeSm, color: accentBlue }}>← Back to Scanner</Text>
            </Pressable>
            <Text style={{ fontFamily: fontFamilyDisplayBold, fontSize: 22, color: textPrimary }}>
              {recipe.title || 'Untitled Recipe'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {recipe.category && <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeSm, color: textSecondary }}>{recipe.category}</Text>}
              {(recipe.servings || totalTime) && <Text style={{ fontSize: fontSizeSm, color: textTertiary }}>·  {recipe.servings ? `${recipe.servings} servings` : ''}{recipe.servings && totalTime ? '  ·  ' : ''}{totalTime}</Text>}
            </View>
            <ConfidenceBadge confidence={draft.overallConfidence.score} />
          </View>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: borderDefault }} />

          {/* Tabs */}
          <TabBar />

          {/* Scrollable tab content */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
            <TabContent />
          </ScrollView>

          {/* Sticky action bar */}
          <StickyActionBar />
        </View>
      </View>
      <DiscardDialog />
    </>
  );
}

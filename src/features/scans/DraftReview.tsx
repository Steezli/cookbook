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
} from 'react-native';
import { router } from 'expo-router';
import { ScanDraft, scanDraftService } from '@/lib/scan/scan-draft-service';
import { ParsedRecipe, FieldConfidence } from '@/lib/ai/recipe-parsing-service';
import { getJobPhotos, subscribeToJob } from '@/features/scan/scan-service';
import { getScanPhotoUrl, getScanThumbnailUrl } from '@/features/scan/scan-photos';
import { useSession } from '@/features/auth/session';
import { useBreakpoint } from '@/lib/hooks/useBreakpoint';
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
} from '@/lib/tokens';

interface DraftReviewProps {
  /** Pass a ScanDraft directly to skip internal fetch (multi-draft path) */
  draft?: ScanDraft;
  /** Job ID used to fetch the draft when `draft` prop is not provided (backward compat) */
  draftId?: string;
  onDraftUpdated?: (draft: ScanDraft) => void;
  /** Called when the draft is saved as a recipe (multi-draft parent coordination) */
  onDraftSaved?: (draft: ScanDraft) => void;
  onEdit?: () => void;
}

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

function ConfidenceBadge({ confidence, label }: { confidence: number; label?: string }) {
  const color = getConfidenceColor(confidence);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {label && (
        <Text
          style={{
            fontFamily: fontFamilyBodyMedium,
            fontSize: fontSizeXs,
            color: textSecondary,
          }}
        >
          {label}
        </Text>
      )}
      <View
        style={{
          backgroundColor: color.bg,
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: radiusPill,
        }}
      >
        <Text
          style={{
            fontFamily: fontFamilyBodyMedium,
            fontSize: fontSizeXs,
            color: color.text,
          }}
        >
          {getConfidenceLabel(confidence)} ({Math.round(confidence * 100)}%)
        </Text>
      </View>
    </View>
  );
}

export function DraftReview({ draft: draftProp, draftId, onDraftUpdated, onDraftSaved, onEdit }: DraftReviewProps) {
  const { session, isLoading: authLoading } = useSession();
  const { breakpoint } = useBreakpoint();
  const isMobile = breakpoint === 'mobile';
  const isSideBySide = breakpoint === 'tablet' || breakpoint === 'web';

  const [draft, setDraft] = useState<ScanDraft | null>(draftProp ?? null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [loading, setLoading] = useState(!draftProp);
  const [jobStatus, setJobStatus] = useState<string>(draftProp ? 'completed' : 'checking');
  const [error, setError] = useState<string | null>(null);

  // Animated value for mobile collapsible photo
  const scrollY = useRef(new Animated.Value(0)).current;

  // Resolve the job ID: from the passed draft, or from the legacy draftId prop (which is actually a jobId)
  const jobId = draftProp?.jobId ?? draftId;

  // When draft prop is provided, sync it into local state and load photos only
  useEffect(() => {
    if (!draftProp) return;

    setDraft(draftProp);
    setLoading(false);
    setJobStatus('completed');

    // Still load photos via the job ID
    const loadPhotos = async () => {
      try {
        const photos = await getJobPhotos(draftProp.jobId);
        const urls = photos.map((photoUrl: string) => {
          if (photoUrl.startsWith('http')) {
            return photoUrl;
          }
          return getScanPhotoUrl(photoUrl);
        });
        setPhotoUrls(urls);
      } catch (photoErr) {
        console.warn('Failed to load scan photos:', photoErr);
      }
    };

    loadPhotos();
  }, [draftProp]);

  // When draft prop is NOT provided, use the legacy fetch/subscribe path
  useEffect(() => {
    if (draftProp) return; // Skip — draft was passed directly
    if (!draftId || !session?.user?.id) return;

    let channel: ReturnType<typeof subscribeToJob> | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let pollIntervalId: ReturnType<typeof setInterval> | null = null;

    const loadPhotos = async (resolvedJobId: string) => {
      try {
        const photos = await getJobPhotos(resolvedJobId);
        const urls = photos.map((photoUrl: string) => {
          if (photoUrl.startsWith('http')) {
            return photoUrl;
          }
          return getScanPhotoUrl(photoUrl);
        });
        setPhotoUrls(urls);
      } catch (photoErr) {
        console.warn('Failed to load scan photos:', photoErr);
        // Don't fail the whole screen if photos fail to load
      }
    };

    const finalizeDraft = async (draftData: ScanDraft) => {
      setDraft(draftData);
      onDraftUpdated?.(draftData);
      await loadPhotos(draftData.jobId);
      setLoading(false);
    };

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

    const loadDraft = async () => {
      try {
        setLoading(true);
        setJobStatus('checking');
        const userId = session!.user.id;
        const draftData = await scanDraftService.getDraftByJobId(draftId, userId);

        if (draftData) {
          // Draft already exists — edge function has completed
          setJobStatus('completed');
          await finalizeDraft(draftData);
          return;
        }

        // Draft not found yet — subscribe to job status changes and wait
        setJobStatus('processing');

        // Safety timeout: 60 seconds
        timeoutId = setTimeout(() => {
          unsubscribe();
          setError('Processing is taking longer than expected. Please try again.');
          setLoading(false);
        }, 60000);

        channel = subscribeToJob(draftId, async (job) => {
          if (job.status === 'completed') {
            unsubscribe();
            try {
              const retryDraft = await scanDraftService.getDraftByJobId(draftId, userId);
              if (retryDraft) {
                setJobStatus('completed');
                await finalizeDraft(retryDraft);
              } else {
                setError('Draft not found after processing completed. Please try again.');
                setLoading(false);
              }
            } catch (err) {
              console.error('Failed to load draft after job completion:', err);
              setError(err instanceof Error ? err.message : 'Failed to load draft');
              setLoading(false);
            }
          } else if (job.status === 'failed') {
            unsubscribe();
            setError('Scan processing failed. Please try again.');
            setLoading(false);
          }
        });

        // Polling fallback: Supabase Realtime can silently fail to deliver events.
        // Poll every 4 seconds as a safety net alongside the subscription.
        pollIntervalId = setInterval(async () => {
          try {
            const polledDraft = await scanDraftService.getDraftByJobId(draftId, userId);
            if (polledDraft) {
              unsubscribe();
              setJobStatus('completed');
              await finalizeDraft(polledDraft);
            }
          } catch {
            // Ignore polling errors — subscription or next poll will handle it
          }
        }, 4000);
      } catch (err) {
        console.error('Failed to load draft:', err);
        setError(err instanceof Error ? err.message : 'Failed to load draft');
        setLoading(false);
      }
    };

    loadDraft();

    return () => {
      unsubscribe();
    };
  }, [draftProp, draftId, session, onDraftUpdated]);

  // --- Loading / Auth / Error states ---

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
        <View
          style={{
            backgroundColor: '#FEFCE8',
            borderWidth: 1,
            borderColor: '#FDE68A',
            borderRadius: radiusSm,
            padding: 20,
          }}
        >
          <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeLg, color: '#92400E', marginBottom: 8 }}>
            Authentication Required
          </Text>
          <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeBase, color: '#A16207' }}>
            Please log in to review drafts
          </Text>
        </View>
      </View>
    );
  }

  if (loading) {
    const isProcessing = jobStatus === 'processing';
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bgPage }}>
        <ActivityIndicator size="large" color={accentBlue} />
        <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeSm, color: textSecondary, marginTop: 12 }}>
          {isProcessing ? 'Processing your scan...' : 'Loading draft...'}
        </Text>
        {isProcessing && (
          <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeXs, color: textTertiary, marginTop: 6 }}>
            This usually takes 10-30 seconds
          </Text>
        )}
      </View>
    );
  }

  if (error || !draft) {
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
            Error Loading Draft
          </Text>
          <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeBase, color: '#DC2626' }}>
            {error || 'Draft not found'}
          </Text>
        </View>
      </View>
    );
  }

  const recipe = draft.recipe;
  const fieldConfidence = draft.fieldConfidence;

  // --- Photo Section ---

  const PhotoSection = ({ height }: { height?: number | Animated.AnimatedInterpolation<number> }) => (
    <View>
      {photoUrls.length > 0 ? (
        <View>
          {/* Main photo */}
          <Animated.View style={{ height: height || 300, overflow: 'hidden', borderRadius: radiusSm }}>
            <Image
              source={{ uri: photoUrls[activePhotoIndex] }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </Animated.View>

          {/* Thumbnail strip for multi-photo */}
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
                  accessibilityRole="button"
                  accessibilityLabel={`View photo ${index + 1}`}
                  accessibilityState={{ selected: index === activePhotoIndex }}
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
            height: 200,
            backgroundColor: noPhotoBg,
            borderRadius: radiusSm,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeSm, color: noPhotoIcon }}>
            No photo available
          </Text>
        </View>
      )}
    </View>
  );

  // --- Draft Fields Section ---

  const DraftFields = () => (
    <View style={{ gap: 16 }}>
      {/* Header + Overall Confidence */}
      <View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ fontFamily: fontFamilyDisplay, fontSize: fontSize2xl, color: textPrimary, marginBottom: 4 }}>
              Recipe Draft Review
            </Text>
            <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeSm, color: textSecondary }}>
              Review extracted recipe data before saving
            </Text>
          </View>
          <ConfidenceBadge confidence={draft.overallConfidence.score} label="Overall" />
        </View>

        {/* Action buttons */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
          <Pressable
            onPress={onEdit}
            accessibilityRole="button"
            accessibilityLabel="Edit draft"
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#0066DD' : accentBlue,
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: radiusSm,
            })}
          >
            <Text style={{ fontFamily: fontFamilyBodyBold, fontSize: fontSizeSm, color: white }}>
              Edit Draft
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back to scans"
            style={({ pressed }) => ({
              backgroundColor: pressed ? borderDefault : bgCard,
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: radiusSm,
            })}
          >
            <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeSm, color: textPrimary }}>
              Back to Scans
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Recipe Title */}
      <View style={{ backgroundColor: bgCard, borderRadius: radiusSm, padding: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ fontFamily: fontFamilyBodyBold, fontSize: fontSizeLg, color: textPrimary }}>
            Recipe Title
          </Text>
          <ConfidenceBadge confidence={fieldConfidence.title} />
        </View>
        <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeXl, color: textPrimary }}>
          {recipe.title || 'No title detected'}
        </Text>
      </View>

      {/* Recipe Details */}
      <View style={{ backgroundColor: bgCard, borderRadius: radiusSm, padding: 16 }}>
        <Text style={{ fontFamily: fontFamilyBodyBold, fontSize: fontSizeLg, color: textPrimary, marginBottom: 12 }}>
          Recipe Details
        </Text>
        <View style={{ gap: 10 }}>
          <DetailRow
            label="Servings"
            value={recipe.servings ? String(recipe.servings) : 'Not detected'}
            confidence={fieldConfidence.servings}
          />
          <DetailRow
            label="Prep Time"
            value={recipe.prepTimeMinutes ? `${recipe.prepTimeMinutes} min` : 'Not detected'}
            confidence={fieldConfidence.prepTime}
          />
          <DetailRow
            label="Cook Time"
            value={recipe.cookTimeMinutes ? `${recipe.cookTimeMinutes} min` : 'Not detected'}
            confidence={fieldConfidence.cookTime}
          />
          <DetailRow label="Category" value={recipe.category || 'Not detected'} />
          <DetailRow label="Cuisine" value={recipe.cuisine || 'Not detected'} />
        </View>
      </View>

      {/* Ingredients */}
      <View style={{ backgroundColor: bgCard, borderRadius: radiusSm, padding: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontFamily: fontFamilyBodyBold, fontSize: fontSizeLg, color: textPrimary }}>
            Ingredients ({recipe.ingredients?.length || 0})
          </Text>
          <ConfidenceBadge confidence={fieldConfidence.ingredients} />
        </View>
        <View style={{ gap: 6 }}>
          {recipe.ingredients?.map((ingredient, index) => {
            const ingColor = getConfidenceColor(ingredient.confidence);
            return (
              <View
                key={index}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: white,
                  borderRadius: radiusSm / 2,
                  padding: 10,
                }}
              >
                <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeSm, color: textPrimary, flex: 1, marginRight: 8 }}>
                  {ingredient.amount && `${ingredient.amount} `}
                  {ingredient.unit && `${ingredient.unit} `}
                  {ingredient.name}
                  {ingredient.preparation && `, ${ingredient.preparation}`}
                </Text>
                <View style={{ backgroundColor: ingColor.bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeXs, color: ingColor.text }}>
                    {Math.round(ingredient.confidence * 100)}%
                  </Text>
                </View>
              </View>
            );
          }) || (
            <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeSm, color: textTertiary, textAlign: 'center', paddingVertical: 16 }}>
              No ingredients detected
            </Text>
          )}
        </View>
      </View>

      {/* Instructions */}
      <View style={{ backgroundColor: bgCard, borderRadius: radiusSm, padding: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontFamily: fontFamilyBodyBold, fontSize: fontSizeLg, color: textPrimary }}>
            Instructions ({recipe.instructions?.length || 0})
          </Text>
          <ConfidenceBadge confidence={fieldConfidence.instructions} />
        </View>
        <View style={{ gap: 8 }}>
          {recipe.instructions?.map((instruction, index) => (
            <View
              key={index}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                backgroundColor: white,
                borderRadius: radiusSm / 2,
                padding: 10,
              }}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: accentBlue,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 10,
                  flexShrink: 0,
                }}
              >
                <Text style={{ fontFamily: fontFamilyBodyBold, fontSize: fontSizeXs, color: white }}>
                  {index + 1}
                </Text>
              </View>
              <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeSm, color: textPrimary, flex: 1 }}>
                {instruction}
              </Text>
            </View>
          )) || (
            <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeSm, color: textTertiary, textAlign: 'center', paddingVertical: 16 }}>
              No instructions detected
            </Text>
          )}
        </View>
      </View>

      {/* Raw OCR Text */}
      <View style={{ backgroundColor: bgCard, borderRadius: radiusSm, padding: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontFamily: fontFamilyBodyBold, fontSize: fontSizeLg, color: textPrimary }}>
            Raw Extracted Text
          </Text>
          <ConfidenceBadge confidence={draft.ocrConfidence} label="OCR" />
        </View>
        <View style={{ backgroundColor: white, borderRadius: radiusSm / 2, padding: 12 }}>
          <Text style={{ fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier', fontSize: fontSizeXs, color: textSecondary }}>
            {draft.rawText}
          </Text>
        </View>
      </View>

      {/* Status + Actions */}
      <View style={{ backgroundColor: bgCard, borderRadius: radiusSm, padding: 16, marginBottom: 24 }}>
        <View style={{ flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fontFamilyBodyBold, fontSize: fontSizeLg, color: textPrimary }}>
              Draft Status
            </Text>
            <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeSm, color: textSecondary, marginTop: 4 }}>
              {draft.status === 'ready' && 'This draft is ready to be saved as a recipe'}
              {draft.status === 'needs_review' && 'This draft needs review - check extracted fields'}
              {draft.status === 'enhanced' && 'This draft has been AI-enhanced'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={onEdit}
              accessibilityRole="button"
              accessibilityLabel="Save as recipe"
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#0066DD' : accentBlue,
                paddingVertical: 12,
                paddingHorizontal: 20,
                borderRadius: radiusMd,
                flex: isMobile ? 1 : undefined,
                alignItems: 'center',
              })}
            >
              <Text style={{ fontFamily: fontFamilyBodyBold, fontSize: fontSizeBase, color: white }}>
                Save as Recipe
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Discard draft"
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#FEE2E2' : 'transparent',
                borderWidth: 1,
                borderColor: accentCoral,
                paddingVertical: 12,
                paddingHorizontal: 20,
                borderRadius: radiusMd,
                flex: isMobile ? 1 : undefined,
                alignItems: 'center',
              })}
            >
              <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeBase, color: accentCoral }}>
                Discard Draft
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );

  // --- Mobile Layout (collapsible photo) ---

  if (isMobile) {
    const photoHeight = scrollY.interpolate({
      inputRange: [0, 200],
      outputRange: [300, 60],
      extrapolate: 'clamp',
    });

    return (
      <View style={{ flex: 1, backgroundColor: bgPage }}>
        {/* Collapsible photo */}
        <PhotoSection height={photoHeight} />

        {/* Scrollable draft fields */}
        <Animated.ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        >
          <DraftFields />
        </Animated.ScrollView>
      </View>
    );
  }

  // --- Tablet / Web Layout (side-by-side) ---

  return (
    <View style={{ flex: 1, backgroundColor: bgPage, flexDirection: 'row' }}>
      {/* Left panel - Photo (~40%) */}
      <View
        style={{
          width: '40%',
          padding: 16,
          borderRightWidth: 1,
          borderRightColor: borderSubtle,
        }}
      >
        <PhotoSection />
      </View>

      {/* Right panel - Draft fields (~60%) */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
      >
        <DraftFields />
      </ScrollView>
    </View>
  );
}

// --- Helper components ---

function DetailRow({
  label,
  value,
  confidence,
}: {
  label: string;
  value: string;
  confidence?: number;
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeSm, color: textSecondary }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeSm, color: textPrimary }}>
          {value}
        </Text>
        {confidence !== undefined && <ConfidenceBadge confidence={confidence} />}
      </View>
    </View>
  );
}

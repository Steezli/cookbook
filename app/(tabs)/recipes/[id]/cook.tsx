import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  type ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react-native';
import { getRecipeById } from '@/features/recipes/api';
import type { Recipe, RecipeStep } from '@/features/recipes/types';
import { getUnitPreference } from '@/features/units/api';
import { displayIngredient } from '@/features/units/displayIngredient';
import {
  getCookingProgress,
  getStepNavState,
  clampStep,
} from '@/features/cooking/cookingModeUtils';
import {
  extractStepIngredients,
  highlightStepIngredients,
} from '@/features/cooking/ingredientMatcher';
import { useBreakpoint } from '@/lib/hooks/useBreakpoint';
import {
  accentBlue,
  accentWarm,
  bgCard,
  bgCardWarm,
  bgPage,
  borderDefault,
  errorText,
  fontFamilyBody,
  fontFamilyBodyMedium,
  fontFamilyDisplay,
  fontSizeBase,
  fontSizeSm,
  fontSizeXl,
  fontSize2xl,
  highlightIngredientBg,
  highlightIngredientText,
  radiusMd,
  textPrimary,
  textSecondary,
  white,
} from '@/lib/tokens';

export default function CookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { breakpoint } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const isWeb = breakpoint === 'web';
  const isTablet = breakpoint === 'tablet';

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [unitPreference, setUnitPreference] = useState<'imperial' | 'metric'>('imperial');
  const [showAllIngredients, setShowAllIngredients] = useState(false);

  const flatListRef = useRef<FlatList<RecipeStep | string>>(null);

  useEffect(() => {
    async function loadRecipe() {
      if (!id) return;
      setIsLoading(true);
      try {
        const data = await getRecipeById(id);
        setRecipe(data);
      } catch (e) {
        setError('Failed to load recipe');
      } finally {
        setIsLoading(false);
      }
    }
    void loadRecipe();
  }, [id]);

  useEffect(() => {
    getUnitPreference().then(setUnitPreference).catch(() => {});
  }, []);

  // Scroll FlatList to step programmatically (for button nav)
  const scrollToStep = useCallback((step: number) => {
    if (!recipe) return;
    const clamped = clampStep(step, recipe.steps.length);
    flatListRef.current?.scrollToIndex({ index: clamped, animated: true });
  }, [recipe]);

  // Track which step is visible from swipe (native paging)
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setCurrentStep(viewableItems[0].index);
      setShowAllIngredients(false);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  // Loading state
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: bgPage, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={accentBlue} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: bgPage, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeBase, color: errorText, textAlign: 'center' }}>
          {error}
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeBase, color: accentBlue }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (!recipe) {
    return (
      <View style={{ flex: 1, backgroundColor: bgPage, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeBase, color: textSecondary, textAlign: 'center' }}>
          Recipe not found or you don't have access.
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeBase, color: accentBlue }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (recipe.steps.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: bgPage, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ fontFamily: fontFamilyBody, fontSize: fontSizeBase, color: textSecondary, textAlign: 'center' }}>
          This recipe has no steps yet.
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ fontFamily: fontFamilyBodyMedium, fontSize: fontSizeBase, color: accentBlue }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const totalSteps = recipe.steps.length;
  const navState = getStepNavState(currentStep, totalSteps);
  const progressPercent = getCookingProgress(currentStep, totalSteps) * 100;
  const contentPadding = isWeb ? 40 : isTablet ? 32 : 24;

  // Render a single step page
  const renderStepPage = ({ item: step, index }: { item: RecipeStep | string; index: number }) => {
    const stepIngredientIndices = extractStepIngredients(typeof step === 'string' ? step : step.text, recipe.ingredients);
    const stepIngredients = stepIngredientIndices.map(i => recipe.ingredients[i]);
    const textSegments = highlightStepIngredients(typeof step === 'string' ? step : step.text, stepIngredients);

    return (
      <View style={{ width: Dimensions.get('window').width, flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            padding: contentPadding,
            flexGrow: 1,
          }}
        >
          {/* Step number badge */}
          <View style={{ alignItems: isWeb ? 'flex-start' : 'center' }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: accentWarm,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamilyDisplay,
                  fontSize: fontSize2xl,
                  color: white,
                }}
              >
                {index + 1}
              </Text>
            </View>
          </View>

          {/* Step instruction with highlighted ingredients */}
          <Text
            style={{
              fontFamily: fontFamilyBody,
              fontSize: fontSizeXl,
              color: textPrimary,
              lineHeight: 32,
              marginTop: 24,
              textAlign: isWeb ? 'left' : 'center',
            }}
          >
            {textSegments.map((segment, i) =>
              segment.highlighted ? (
                <Text
                  key={i}
                  style={{
                    backgroundColor: highlightIngredientBg,
                    color: highlightIngredientText,
                    fontFamily: fontFamilyBodyMedium,
                    borderRadius: 4,
                  }}
                >
                  {segment.text}
                </Text>
              ) : (
                <Text key={i}>{segment.text}</Text>
              )
            )}
          </Text>

          {/* "You'll need" card — step-relevant ingredients with conversions */}
          {stepIngredients.length > 0 && (
            <View
              style={{
                backgroundColor: bgCardWarm,
                borderRadius: radiusMd,
                padding: 16,
                marginTop: 32,
                gap: 12,
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamilyDisplay,
                  fontSize: fontSizeBase,
                  color: textPrimary,
                }}
              >
                You'll need
              </Text>
              {stepIngredients.map((ing, i) => (
                <View
                  key={i}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
                >
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: accentWarm,
                    }}
                  />
                  <Text
                    style={{
                      fontFamily: fontFamilyBody,
                      fontSize: fontSizeSm,
                      color: textPrimary,
                      flex: 1,
                    }}
                  >
                    {displayIngredient(ing, unitPreference)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Full ingredient list — expandable (only on current step) */}
          {index === currentStep && (
            <>
              <Pressable
                onPress={() => setShowAllIngredients(!showAllIngredients)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  marginTop: 20,
                  paddingVertical: 8,
                }}
              >
                <Text
                  style={{
                    fontFamily: fontFamilyBodyMedium,
                    fontSize: fontSizeSm,
                    color: textSecondary,
                  }}
                >
                  {showAllIngredients ? 'Hide full ingredient list' : 'View all ingredients'}
                </Text>
                {showAllIngredients ? (
                  <ChevronUp size={16} color={textSecondary} />
                ) : (
                  <ChevronDown size={16} color={textSecondary} />
                )}
              </Pressable>

              {showAllIngredients && (
                <View
                  style={{
                    backgroundColor: bgCard,
                    borderRadius: radiusMd,
                    padding: 16,
                    marginTop: 4,
                  }}
                >
                  {recipe.ingredients.map((ing, i) => {
                    const isRelevant = stepIngredientIndices.includes(i);
                    return (
                      <View
                        key={i}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'flex-start',
                          marginBottom: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: fontFamilyBody,
                            fontSize: fontSizeSm,
                            color: isRelevant ? accentWarm : textSecondary,
                            marginRight: 8,
                          }}
                        >
                          •
                        </Text>
                        <Text
                          style={{
                            fontFamily: isRelevant ? fontFamilyBodyMedium : fontFamilyBody,
                            fontSize: fontSizeSm,
                            color: isRelevant ? textPrimary : textSecondary,
                            flex: 1,
                          }}
                        >
                          {displayIngredient(ing, unitPreference)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    );
  };

  // Web sidebar step list
  const Sidebar = () => (
    <View style={{ width: 200, borderRightWidth: 1, borderRightColor: borderDefault }}>
      <ScrollView>
        {recipe.steps.map((s, i) => {
          const isActive = i === currentStep;
          return (
            <Pressable
              key={i}
              onPress={() => {
                setCurrentStep(i);
                setShowAllIngredients(false);
              }}
              style={{
                padding: 16,
                backgroundColor: isActive ? bgCard : bgPage,
              }}
            >
              <Text
                style={{
                  fontFamily: isActive ? fontFamilyBodyMedium : fontFamilyBody,
                  fontSize: fontSizeBase,
                  color: isActive ? textPrimary : textSecondary,
                }}
              >
                Step {i + 1}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: bgPage }}>
      {/* Top bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: insets.top + 16,
          paddingBottom: 16,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <X size={24} color={textPrimary} />
        </Pressable>

        <Text
          numberOfLines={1}
          style={{
            fontFamily: fontFamilyDisplay,
            fontSize: fontSizeBase,
            color: textPrimary,
            flex: 1,
            textAlign: 'center',
            marginHorizontal: 8,
          }}
        >
          {recipe.title}
        </Text>

        <Text
          style={{
            fontFamily: fontFamilyBody,
            fontSize: fontSizeSm,
            color: textSecondary,
          }}
        >
          Step {currentStep + 1} of {totalSteps}
        </Text>
      </View>

      {/* Progress bar */}
      <View
        style={{
          height: 4,
          backgroundColor: borderDefault,
          borderRadius: 2,
          marginHorizontal: 16,
        }}
      >
        <View
          style={{
            height: 4,
            backgroundColor: accentWarm,
            borderRadius: 2,
            width: `${progressPercent}%` as any,
          }}
        />
      </View>

      {/* Content area */}
      <View style={{ flex: 1, flexDirection: isWeb ? 'row' : 'column' }}>
        {isWeb && <Sidebar />}

        {/* Native: horizontal paging FlatList for swipe between steps */}
        {!isWeb ? (
          <FlatList
            ref={flatListRef}
            data={recipe.steps}
            renderItem={renderStepPage}
            keyExtractor={(_, index) => `step-${index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            getItemLayout={(_, index) => ({
              length: Dimensions.get('window').width,
              offset: Dimensions.get('window').width * index,
              index,
            })}
            initialScrollIndex={0}
            style={{ flex: 1 }}
          />
        ) : (
          /* Web: single step view (sidebar handles navigation) */
          <View style={{ flex: 1 }}>
            {renderStepPage({ item: recipe.steps[currentStep], index: currentStep })}
          </View>
        )}
      </View>

      {/* Bottom navigation */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          padding: 16,
          borderTopWidth: 1,
          borderTopColor: borderDefault,
        }}
      >
        <Pressable
          onPress={() => {
            const prev = clampStep(currentStep - 1, totalSteps);
            setCurrentStep(prev);
            scrollToStep(prev);
          }}
          disabled={!navState.canGoPrev}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            opacity: navState.canGoPrev ? 1 : 0.3,
          }}
        >
          <ChevronLeft size={20} color={accentBlue} />
          <Text
            style={{
              fontFamily: fontFamilyBody,
              fontSize: fontSizeBase,
              color: accentBlue,
            }}
          >
            Previous
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            if (navState.isLastStep) {
              router.back();
            } else {
              const next = clampStep(currentStep + 1, totalSteps);
              setCurrentStep(next);
              scrollToStep(next);
            }
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Text
            style={{
              fontFamily: fontFamilyBody,
              fontSize: fontSizeBase,
              color: accentBlue,
            }}
          >
            {navState.isLastStep ? 'Done' : 'Next'}
          </Text>
          {!navState.isLastStep && <ChevronRight size={20} color={accentBlue} />}
        </Pressable>
      </View>
    </View>
  );
}

import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react-native';
import { getRecipeById } from '@/features/recipes/api';
import type { Recipe } from '@/features/recipes/types';
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

const SWIPE_THRESHOLD = 50;
const SWIPE_VELOCITY_THRESHOLD = 0.3;

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

  // Swipe animation
  const translateX = useRef(new Animated.Value(0)).current;

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

  const goToStep = useCallback((step: number) => {
    if (!recipe) return;
    const clamped = clampStep(step, recipe.steps.length);
    if (clamped === currentStep) return;

    // Animate slide direction
    const direction = clamped > currentStep ? -1 : 1;
    const screenWidth = Dimensions.get('window').width;

    // Slide out
    Animated.timing(translateX, {
      toValue: direction * screenWidth,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentStep(clamped);
      setShowAllIngredients(false);
      // Snap to opposite side then slide in
      translateX.setValue(-direction * screenWidth);
      Animated.timing(translateX, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  }, [currentStep, recipe, translateX]);

  // PanResponder for swipe gestures (mobile/tablet only)
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        // Only capture horizontal swipes that exceed a threshold
        return (
          Math.abs(gestureState.dx) > 10 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5
        );
      },
      onPanResponderMove: (_evt, gestureState) => {
        translateX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_evt, gestureState) => {
        const { dx, vx } = gestureState;
        const swipedLeft = dx < -SWIPE_THRESHOLD || vx < -SWIPE_VELOCITY_THRESHOLD;
        const swipedRight = dx > SWIPE_THRESHOLD || vx > SWIPE_VELOCITY_THRESHOLD;

        if (swipedLeft) {
          // Swipe left → next step
          goToStep(currentStep + 1);
        } else if (swipedRight) {
          // Swipe right → previous step
          goToStep(currentStep - 1);
        } else {
          // Snap back
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 10,
          }).start();
        }
      },
    })
  ).current;

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
  const step = recipe.steps[currentStep];
  const contentPadding = isWeb ? 40 : isTablet ? 32 : 24;

  // Get matched ingredient indices for the current step
  const stepIngredientIndices = extractStepIngredients(step.text, recipe.ingredients);
  const stepIngredients = stepIngredientIndices.map(i => recipe.ingredients[i]);

  // Get highlighted text segments for the current step
  const textSegments = highlightStepIngredients(step.text, stepIngredients);

  // Web sidebar step list
  const Sidebar = () => (
    <View style={{ width: 200, borderRightWidth: 1, borderRightColor: borderDefault }}>
      <ScrollView>
        {recipe.steps.map((s, i) => {
          const isActive = i === currentStep;
          return (
            <Pressable
              key={i}
              onPress={() => goToStep(i)}
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

  // Main content (mobile/tablet/web)
  const MainContent = () => (
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
            {currentStep + 1}
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

      {/* Full ingredient list — expandable */}
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
    </ScrollView>
  );

  // Swipe handlers for mobile/tablet
  const swipeProps = !isWeb ? panResponder.panHandlers : {};

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

      {/* Content area — responsive layout with swipe support */}
      <View style={{ flex: 1, flexDirection: isWeb ? 'row' : 'column' }}>
        {isWeb && <Sidebar />}
        <Animated.View
          style={{ flex: 1, transform: [{ translateX }] }}
          {...swipeProps}
        >
          <MainContent />
        </Animated.View>
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
          onPress={() => goToStep(currentStep - 1)}
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
              goToStep(currentStep + 1);
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

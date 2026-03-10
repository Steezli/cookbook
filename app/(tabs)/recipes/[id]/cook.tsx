import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { getRecipeById } from '@/features/recipes/api';
import type { Recipe } from '@/features/recipes/types';
import { displayAmount } from '@/features/units/conversions';
import { getUnitPreference } from '@/features/units/api';
import {
  getCookingProgress,
  getStepNavState,
  clampStep,
} from '@/features/cooking/cookingModeUtils';
import { useBreakpoint } from '@/lib/hooks/useBreakpoint';
import {
  accentBlue,
  bgCard,
  bgPage,
  borderDefault,
  fontFamilyBody,
  fontFamilyBodyMedium,
  fontFamilyDisplay,
  fontSizeBase,
  fontSizeSm,
  fontSizeXl,
  fontSize2xl,
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
  const [currentStep, setCurrentStep] = useState(0);
  const [unitPreference, setUnitPreference] = useState<'imperial' | 'metric'>('imperial');

  useEffect(() => {
    async function loadRecipe() {
      if (!id) return;
      setIsLoading(true);
      try {
        const data = await getRecipeById(id);
        setRecipe(data);
      } catch (e) {
        // Error handled via recipe === null check below
      } finally {
        setIsLoading(false);
      }
    }
    void loadRecipe();
  }, [id]);

  useEffect(() => {
    getUnitPreference().then(setUnitPreference).catch(() => {});
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: bgPage, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={accentBlue} />
      </View>
    );
  }

  // No recipe found
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

  // No steps edge case
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

  function displayIngredient(ing: Recipe['ingredients'][0]): string {
    if (ing.amount !== undefined && ing.unit !== undefined && !ing.is_ambiguous) {
      return displayAmount(ing.amount ?? null, ing.unit ?? null, unitPreference, ing.original_text || ing.text);
    }
    if (ing.is_ambiguous) return `${ing.text} (approx.)`;
    return ing.text;
  }

  // Web sidebar step list
  const Sidebar = () => (
    <View style={{ width: 200, borderRightWidth: 1, borderRightColor: borderDefault }}>
      <ScrollView>
        {recipe.steps.map((s, i) => {
          const isActive = i === currentStep;
          return (
            <Pressable
              key={i}
              onPress={() => setCurrentStep(i)}
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
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: accentBlue,
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

      {/* Step instruction */}
      <Text
        style={{
          fontFamily: fontFamilyBody,
          fontSize: fontSizeXl,
          color: textPrimary,
          lineHeight: 28,
          marginTop: 24,
          textAlign: isWeb ? 'left' : 'center',
        }}
      >
        {step.text}
      </Text>

      {/* You'll need card — full ingredient list */}
      <View
        style={{
          backgroundColor: bgCard,
          borderRadius: 16,
          padding: 16,
          marginTop: 32,
        }}
      >
        <Text
          style={{
            fontFamily: fontFamilyBodyMedium,
            fontSize: fontSizeSm,
            color: textSecondary,
            marginBottom: 12,
          }}
        >
          Full Ingredient List
        </Text>
        {recipe.ingredients.map((ing, i) => (
          <View
            key={i}
            style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}
          >
            <Text
              style={{
                fontFamily: fontFamilyBody,
                fontSize: fontSizeBase,
                color: textPrimary,
                marginRight: 8,
              }}
            >
              •
            </Text>
            <Text
              style={{
                fontFamily: fontFamilyBody,
                fontSize: fontSizeBase,
                color: textPrimary,
                flex: 1,
              }}
            >
              {displayIngredient(ing)}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
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
        {/* X button */}
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <X size={24} color={textPrimary} />
        </Pressable>

        {/* Recipe title */}
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

        {/* Step counter */}
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
            backgroundColor: accentBlue,
            borderRadius: 2,
            width: `${progressPercent}%` as any,
          }}
        />
      </View>

      {/* Content area — responsive layout */}
      <View style={{ flex: 1, flexDirection: isWeb ? 'row' : 'column' }}>
        {isWeb && <Sidebar />}
        <View style={{ flex: 1 }}>
          <MainContent />
        </View>
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
        {/* Previous button */}
        <Pressable
          onPress={() => setCurrentStep(s => clampStep(s - 1, totalSteps))}
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

        {/* Next / Done button */}
        <Pressable
          onPress={() => {
            if (navState.isLastStep) {
              router.back();
            } else {
              setCurrentStep(s => clampStep(s + 1, totalSteps));
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

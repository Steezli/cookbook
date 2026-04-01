import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import Head from 'expo-router/head';

import { useBreakpoint } from '@/lib/hooks/useBreakpoint';
import { SITE_NAME, SITE_URL } from '@/lib/site-config';
import { generateRecipeJsonLd } from '@/lib/seo/json-ld';
import { generateRecipeMetaTags } from '@/lib/seo/meta-tags';
import { PublicDetailNavBar } from '@/components/public/PublicNavHeader';
import AdSlot from '@/components/public/AdSlot';
import { getRecipeById } from '@/features/recipes/api';
import { getPublicRecipeAuthor } from '@/features/recipes/public';
import type { PublicAuthor } from '@/features/recipes/public';
import { getRecipePhotos, getThumbnailUrl } from '@/features/recipes/photos';
import type { Recipe, RecipeIngredient } from '@/features/recipes/types';
import { displayIngredient } from '@/features/units/displayIngredient';
import { getUnitPreference } from '@/features/units/api';
import type { UnitSystem } from '@/features/units/types';
import {
  accentBlue,
  accentWarm,
  bgCard,
  bgCardWarm,
  bgPage,
  fontFamilyBody,
  fontFamilyBodyBold,
  fontFamilyBodyMedium,
  fontFamilyDisplayBold,
  radiusMd,
  radiusPill,
  radiusSm,
  textPrimary,
  textSecondary,
  textTertiary,
  white,
} from '@/lib/tokens';

export default function PublicRecipeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { breakpoint } = useBreakpoint();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [author, setAuthor] = useState<PublicAuthor | null>(null);
  const [heroUrl, setHeroUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllIngredients, setShowAllIngredients] = useState(false);
  const [unitPreference, setUnitPreference] = useState<UnitSystem>('imperial');

  useEffect(() => {
    getUnitPreference().then(setUnitPreference).catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all([
      getRecipeById(id),
      getPublicRecipeAuthor(id),
      getRecipePhotos(id),
    ])
      .then(([recipeData, authorData, photos]) => {
        if (cancelled) return;
        if (!recipeData) {
          setError('Recipe not found');
          setIsLoading(false);
          return;
        }
        setRecipe(recipeData);
        setAuthor(authorData);
        if (photos.length > 0) {
          setHeroUrl(getThumbnailUrl(photos[0].storage_path, 800));
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Something went wrong');
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: bgPage }}>
        <PublicDetailNavBar onBack={() => router.back()} />
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <ActivityIndicator size="large" color={accentWarm} />
        </View>
      </View>
    );
  }

  if (error || !recipe) {
    return (
      <View style={{ flex: 1, backgroundColor: bgPage }}>
        <PublicDetailNavBar onBack={() => router.back()} />
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text
            style={{
              fontSize: 16,
              fontFamily: fontFamilyBody,
              color: textSecondary,
            }}
          >
            {error ?? 'Recipe not found'}
          </Text>
        </View>
      </View>
    );
  }

  // At this point recipe is guaranteed non-null (early returns above handle null).
  // Alias to a const so TypeScript narrows inside nested functions.
  const r = recipe;

  const ingredients = r.ingredients ?? [];
  const visibleIngredients = showAllIngredients
    ? ingredients
    : ingredients.slice(0, 3);
  const hiddenCount = ingredients.length - 3;

  // -------------------------------------------------------------------------
  // SEO head (web only)
  // -------------------------------------------------------------------------

  function renderSeoHead() {
    if (Platform.OS !== 'web') return null;

    const pageUrl = `${SITE_URL}/recipe/${r.id}`;
    const jsonLd = generateRecipeJsonLd(r, author, heroUrl);
    const metaTags = generateRecipeMetaTags(r, heroUrl, pageUrl);

    return (
      <Head>
        <title>{r.title} | {SITE_NAME}</title>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        {metaTags.map((tag, i) => (
          <meta
            key={i}
            {...(tag.property ? { property: tag.property } : {})}
            {...(tag.name ? { name: tag.name } : {})}
            content={tag.content}
          />
        ))}
      </Head>
    );
  }

  // -------------------------------------------------------------------------
  // Shared sub-renders
  // -------------------------------------------------------------------------

  const heroHeight =
    breakpoint === 'web' ? 320 : breakpoint === 'tablet' ? 300 : 220;
  const heroRadius = breakpoint === 'web' ? radiusMd : 0;

  function renderHero() {
    if (!heroUrl) return null;
    return (
      <Image
        source={{ uri: heroUrl }}
        style={{
          width: '100%',
          height: heroHeight,
          borderRadius: heroRadius,
          overflow: 'hidden',
        }}
        resizeMode="cover"
      />
    );
  }

  const titleFontSize =
    breakpoint === 'web' ? 32 : breakpoint === 'tablet' ? 28 : 24;
  const avatarSize = breakpoint === 'mobile' ? 32 : 36;
  const avatarRadius = avatarSize / 2;
  const initialsFontSize = breakpoint === 'mobile' ? 12 : 13;
  const nameFontSize = breakpoint === 'mobile' ? 13 : 14;
  const labelFontSize = breakpoint === 'mobile' ? 11 : 12;

  function renderAuthorRow() {
    return (
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <View
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarRadius,
            backgroundColor: accentBlue,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              fontSize: initialsFontSize,
              fontFamily: fontFamilyBodyBold,
              color: white,
            }}
          >
            {author?.initials ?? 'U'}
          </Text>
        </View>
        <View style={{ gap: 2 }}>
          <Text
            style={{
              fontSize: nameFontSize,
              fontFamily: fontFamilyBodyMedium,
              color: textPrimary,
            }}
          >
            {author?.display_name ?? 'Anonymous'}
          </Text>
          <Text
            style={{
              fontSize: labelFontSize,
              fontFamily: fontFamilyBody,
              color: textTertiary,
            }}
          >
            Public recipe
          </Text>
        </View>
      </View>
    );
  }

  function renderDescription() {
    if (!r.description) return null;
    return (
      <Text
        style={{
          fontSize: 14,
          fontFamily: fontFamilyBody,
          color: textSecondary,
        }}
      >
        {r.description}
      </Text>
    );
  }

  const metaPadding = breakpoint === 'mobile' ? 14 : 16;
  const metaValueSize = breakpoint === 'mobile' ? 15 : 16;

  function renderMetadataStats() {
    const stats: { value: string; label: string }[] = [];
    if (r.cook_time_minutes) {
      stats.push({
        value: `${r.cook_time_minutes} min`,
        label: 'Cook time',
      });
    }
    if (r.servings) {
      stats.push({ value: `${r.servings}`, label: 'Servings' });
    }
    if (stats.length === 0) return null;

    return (
      <View
        style={{
          backgroundColor: bgCard,
          borderRadius: radiusSm,
          padding: metaPadding,
          flexDirection: 'row',
          justifyContent: 'space-around',
        }}
      >
        {stats.map((stat) => (
          <View key={stat.label} style={{ alignItems: 'center', gap: 2 }}>
            <Text
              style={{
                fontSize: metaValueSize,
                fontFamily: fontFamilyBodyMedium,
                color: textPrimary,
              }}
            >
              {stat.value}
            </Text>
            <Text
              style={{
                fontSize: 11,
                fontFamily: fontFamilyBody,
                color: textTertiary,
              }}
            >
              {stat.label}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  function renderIngredientItem(ingredient: RecipeIngredient, index: number) {
    return (
      <View
        key={index}
        style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}
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
            fontSize: breakpoint === 'web' ? 13 : 14,
            fontFamily: fontFamilyBody,
            color: textPrimary,
          }}
        >
          {displayIngredient(ingredient, unitPreference)}
        </Text>
      </View>
    );
  }

  function renderIngredients(headingSize: number, moreSize: number) {
    return (
      <View style={{ gap: 10 }}>
        <Text
          style={{
            fontSize: headingSize,
            fontFamily: fontFamilyDisplayBold,
            color: textPrimary,
          }}
        >
          Ingredients
        </Text>
        {visibleIngredients.map((ing, i) => renderIngredientItem(ing, i))}
        {ingredients.length > 3 && !showAllIngredients && (
          <Pressable onPress={() => setShowAllIngredients(true)}>
            <Text
              style={{
                fontSize: moreSize,
                fontFamily: fontFamilyBodyMedium,
                color: accentWarm,
              }}
            >
              + {hiddenCount} more ingredients
            </Text>
          </Pressable>
        )}
      </View>
    );
  }

  function renderSteps() {
    if (!r.steps || r.steps.length === 0) return null;
    return (
      <View style={{ gap: 10 }}>
        <Text
          style={{
            fontSize: breakpoint === 'web' ? 22 : 20,
            fontFamily: fontFamilyDisplayBold,
            color: textPrimary,
          }}
        >
          Steps
        </Text>
        {r.steps.map((step, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
            <Text
              style={{
                fontSize: 14,
                fontFamily: fontFamilyBodyBold,
                color: accentWarm,
                minWidth: 20,
              }}
            >
              {i + 1}.
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontFamily: fontFamilyBody,
                color: textPrimary,
                flex: 1,
              }}
            >
              {typeof step === 'string' ? step : step.text}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  function renderCTA() {
    const ctaPadding =
      breakpoint === 'web' ? 20 : breakpoint === 'tablet' ? 24 : 20;
    const ctaHeadingSize =
      breakpoint === 'tablet' ? 18 : 16;
    const ctaDescMaxWidth =
      breakpoint === 'tablet' ? 400 : breakpoint === 'web' ? 260 : 280;
    const ctaButtonWidth = breakpoint === 'web' ? '100%' as const : undefined;

    return (
      <View
        style={{
          backgroundColor: bgCardWarm,
          borderRadius: radiusMd,
          padding: ctaPadding,
          gap: 10,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontSize: ctaHeadingSize,
            fontFamily: fontFamilyDisplayBold,
            color: textPrimary,
            textAlign: 'center',
          }}
        >
          {breakpoint === 'web'
            ? 'Save this recipe'
            : 'Want to save this recipe?'}
        </Text>
        <Text
          style={{
            fontSize: 13,
            fontFamily: fontFamilyBody,
            color: textSecondary,
            textAlign: 'center',
            maxWidth: ctaDescMaxWidth,
          }}
        >
          Create a free account to save recipes, build collections, and share
          with family.
        </Text>
        <Pressable
          onPress={() => router.push('/(auth)/signup')}
          style={{
            backgroundColor: accentWarm,
            borderRadius: radiusPill,
            paddingHorizontal: 24,
            paddingVertical: 14,
            alignItems: 'center',
            width: ctaButtonWidth,
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontFamily: fontFamilyBodyMedium,
              color: white,
            }}
          >
            Create Free Account
          </Text>
        </Pressable>
      </View>
    );
  }

  // -------------------------------------------------------------------------
  // WEB layout — two columns
  // -------------------------------------------------------------------------
  if (breakpoint === 'web') {
    return (
      <View style={{ flex: 1, backgroundColor: bgPage }}>
        {renderSeoHead()}
        <PublicDetailNavBar onBack={() => router.back()} />
        <ScrollView
          contentContainerStyle={{
            alignItems: 'center',
            paddingHorizontal: 48,
            paddingVertical: 32,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              width: '100%',
              maxWidth: 960,
              gap: 40,
              alignItems: 'flex-start',
            }}
          >
            {/* Left column */}
            <View style={{ flex: 1, gap: 24 }}>
              {renderHero()}
              <Text
                style={{
                  fontSize: 32,
                  fontFamily: fontFamilyDisplayBold,
                  color: textPrimary,
                }}
              >
                {r.title}
              </Text>
              {renderAuthorRow()}
              {renderDescription()}
              {renderMetadataStats()}
              {renderSteps()}
            </View>

            {/* Right column */}
            <View style={{ width: 320, gap: 24 }}>
              <View
                style={{
                  backgroundColor: bgCard,
                  borderRadius: radiusMd,
                  padding: 20,
                  gap: 12,
                }}
              >
                {renderIngredients(18, 12)}
              </View>
              {renderCTA()}
              <AdSlot variant="sidebar" />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // -------------------------------------------------------------------------
  // MOBILE / TABLET — single column
  // -------------------------------------------------------------------------
  const contentMaxWidth = breakpoint === 'tablet' ? 640 : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: bgPage }}>
      {renderSeoHead()}
      <PublicDetailNavBar onBack={() => router.back()} />
      <ScrollView>
        {renderHero()}
        <View
          style={{
            paddingHorizontal: 24,
            paddingVertical: 20,
            gap: 20,
            maxWidth: contentMaxWidth,
            alignSelf: breakpoint === 'tablet' ? 'center' : undefined,
            width: '100%',
          }}
        >
          <Text
            style={{
              fontSize: titleFontSize,
              fontFamily: fontFamilyDisplayBold,
              color: textPrimary,
            }}
          >
            {r.title}
          </Text>
          {renderAuthorRow()}
          {renderDescription()}
          {renderMetadataStats()}
          {renderIngredients(20, 13)}
          {renderSteps()}
          {renderCTA()}
          <AdSlot
            variant={breakpoint === 'mobile' ? 'mobile' : 'leaderboard'}
            style={{ alignSelf: 'center', marginTop: 8 }}
          />
        </View>
      </ScrollView>
    </View>
  );
}

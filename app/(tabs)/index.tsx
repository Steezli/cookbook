import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Search } from 'lucide-react-native';

import { supabase } from '@/lib/supabase';
import { useSession } from '@/features/auth/session';
import { useBreakpoint } from '@/lib/hooks/useBreakpoint';
import { PageContainer } from '@/components/nav/PageContainer';
import { RecipeCard } from '@/components/recipes/RecipeCard';
import { getNumColumns } from '@/components/recipes/recipeCardUtils';
import { searchRecipes } from '@/features/recipes/search';
import { getRecipeThumbnailUrlMap } from '@/features/recipes/photos';
import type { Recipe } from '@/features/recipes/types';
import {
  accentBlue,
  borderDefault,
  fontFamilyBody,
  fontFamilyDisplay,
  fontSizeBase,
  fontSizeLg,
  fontSize2xl,
  radiusMd,
  textPrimary,
  textSecondary,
  white,
} from '@/lib/tokens';

const FEATURED_COUNT = 3;
const RECENT_COUNT = 6;
const FEATURED_CARD_WIDTH = 220;

export default function HomeScreen() {
  const { session } = useSession();
  const { breakpoint } = useBreakpoint();

  const [displayName, setDisplayName] = useState<string>('');
  const [featuredRecipes, setFeaturedRecipes] = useState<Recipe[]>([]);
  const [recentRecipes, setRecentRecipes] = useState<Recipe[]>([]);
  const [thumbnailMap, setThumbnailMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  const sectionGap = breakpoint === 'mobile' ? 24 : 32;
  const numColumns = getNumColumns(breakpoint);

  const loadData = useCallback(async () => {
    if (!session?.user) return;

    setIsLoading(true);
    try {
      // Load display name from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', session.user.id)
        .single();

      const name =
        (profile as { display_name?: string | null } | null)?.display_name?.trim() ||
        (session.user.email?.split('@')[0] ?? '');
      setDisplayName(name);

      // Load recipes (most recent first)
      const allRecipes = await searchRecipes({});
      const featured = allRecipes.slice(0, FEATURED_COUNT);
      const recent = allRecipes.slice(FEATURED_COUNT, FEATURED_COUNT + RECENT_COUNT);

      setFeaturedRecipes(featured);
      setRecentRecipes(recent);

      // Batch thumbnail fetch for all recipes
      const allIds = [...featured, ...recent].map((r) => r.id);
      if (allIds.length > 0) {
        const urls = await getRecipeThumbnailUrlMap(allIds, 300);
        setThumbnailMap(urls);
      }
    } catch (err) {
      console.warn('HomeScreen load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const navigateToRecipes = () => {
    router.push('/recipes' as any);
  };

  const navigateToRecipe = (id: string) => {
    router.push(`/recipes/${id}` as any);
  };

  const navigateToCreate = () => {
    router.push('/recipes/create' as any);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={accentBlue} />
      </View>
    );
  }

  const hasRecipes = featuredRecipes.length > 0 || recentRecipes.length > 0;

  return (
    <PageContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
      >
        {/* Greeting */}
        <Text
          style={{
            fontFamily: fontFamilyDisplay,
            fontSize: fontSize2xl,
            color: textPrimary,
            marginBottom: sectionGap,
          }}
        >
          Welcome back, {displayName}
        </Text>

        {/* Search bar (navigation entry point) */}
        <Pressable
          onPress={navigateToRecipes}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: borderDefault,
            borderRadius: radiusMd,
            paddingHorizontal: 14,
            paddingVertical: 12,
            marginBottom: sectionGap,
            gap: 10,
          }}
        >
          <Search size={18} color={textSecondary} />
          <Text
            style={{
              fontFamily: fontFamilyBody,
              fontSize: fontSizeBase,
              color: textSecondary,
            }}
          >
            Search recipes...
          </Text>
        </Pressable>

        {!hasRecipes ? (
          /* Empty state */
          <View style={{ alignItems: 'center', paddingTop: 40, gap: 16 }}>
            <Text
              style={{
                fontFamily: fontFamilyDisplay,
                fontSize: fontSizeLg,
                color: textPrimary,
              }}
            >
              No recipes yet
            </Text>
            <Pressable
              onPress={navigateToCreate}
              style={{
                backgroundColor: accentBlue,
                borderRadius: radiusMd,
                paddingHorizontal: 24,
                paddingVertical: 12,
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamilyBody,
                  fontSize: fontSizeBase,
                  color: white,
                }}
              >
                Create your first recipe
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Featured Recipes */}
            {featuredRecipes.length > 0 && (
              <View style={{ marginBottom: sectionGap }}>
                <SectionHeader
                  title="Featured Recipes"
                  onSeeAll={navigateToRecipes}
                />
                <FlatList
                  data={featuredRecipes}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 12 }}
                  style={{ marginTop: 12 }}
                  renderItem={({ item }) => (
                    <RecipeCard
                      recipe={item}
                      thumbnailUrl={thumbnailMap[item.id]}
                      onPress={() => navigateToRecipe(item.id)}
                      style={{ width: FEATURED_CARD_WIDTH }}
                    />
                  )}
                />
              </View>
            )}

            {/* Recent Recipes */}
            {recentRecipes.length > 0 && (
              <View>
                <SectionHeader
                  title="Recent Recipes"
                  onSeeAll={navigateToRecipes}
                />
                <FlatList
                  data={recentRecipes}
                  keyExtractor={(item) => item.id}
                  numColumns={numColumns}
                  key={numColumns}
                  scrollEnabled={false}
                  columnWrapperStyle={numColumns > 1 ? { gap: 12 } : undefined}
                  contentContainerStyle={{ gap: 12, marginTop: 12 }}
                  renderItem={({ item }) => (
                    <RecipeCard
                      recipe={item}
                      thumbnailUrl={thumbnailMap[item.id]}
                      onPress={() => navigateToRecipe(item.id)}
                      style={{ flex: 1 }}
                    />
                  )}
                />
              </View>
            )}
          </>
        )}
      </ScrollView>
    </PageContainer>
  );
}

type SectionHeaderProps = {
  title: string;
  onSeeAll: () => void;
};

function SectionHeader({ title, onSeeAll }: SectionHeaderProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Text
        style={{
          fontFamily: fontFamilyDisplay,
          fontSize: fontSizeLg,
          color: textPrimary,
        }}
      >
        {title}
      </Text>
      <Pressable onPress={onSeeAll}>
        <Text
          style={{
            fontFamily: fontFamilyBody,
            fontSize: fontSizeBase,
            color: accentBlue,
          }}
        >
          See all
        </Text>
      </Pressable>
    </View>
  );
}

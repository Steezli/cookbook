import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { UtensilsCrossed } from 'lucide-react-native';

import type { Recipe } from '@/features/recipes/types';
import { formatMetadataLine, getVisibilityColor } from '@/components/recipes/recipeCardUtils';
import {
  bgCard,
  fontFamilyBody,
  noPhotoBg,
  noPhotoIcon,
  fontFamilyBodyMedium,
  fontFamilyDisplay,
  fontSizeBase,
  fontSizeSm,
  radiusMd,
  radiusPill,
  shadowSm,
  textPrimary,
  textSecondary,
} from '@/lib/tokens';

type RecipeCardProps = {
  recipe: Recipe;
  thumbnailUrl?: string;
  onPress: () => void;
  style?: object;
};

export function RecipeCard({ recipe, thumbnailUrl, onPress, style }: RecipeCardProps) {
  const visibilityColor = getVisibilityColor(recipe.visibility);
  const metadataLine = formatMetadataLine(
    recipe.prep_time_minutes,
    recipe.cook_time_minutes,
    recipe.servings,
  );
  const visibilityLabel =
    recipe.visibility === 'private'
      ? 'Private'
      : recipe.visibility === 'family'
      ? 'Family'
      : 'Public';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`View recipe: ${recipe.title}`}
      style={[
        {
          backgroundColor: bgCard,
          borderRadius: radiusMd,
          overflow: 'hidden',
          ...shadowSm,
        },
        style,
      ]}
    >
      {/* 180px image area */}
      {thumbnailUrl ? (
        <Image
          source={{ uri: thumbnailUrl }}
          style={{ width: '100%', height: 180 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: '100%',
            height: 180,
            backgroundColor: noPhotoBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <UtensilsCrossed size={32} color={noPhotoIcon} />
        </View>
      )}

      {/* Content area */}
      <View style={{ padding: 12 }}>
        {/* Visibility badge */}
        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: `${visibilityColor}20`,
            borderRadius: radiusPill,
            paddingHorizontal: 8,
            paddingVertical: 3,
            marginBottom: 8,
          }}
        >
          <Text
            style={{
              fontFamily: fontFamilyBodyMedium,
              fontSize: fontSizeSm,
              color: visibilityColor,
            }}
          >
            {visibilityLabel}
          </Text>
        </View>

        {/* Title */}
        <Text
          numberOfLines={2}
          style={{
            fontFamily: fontFamilyDisplay,
            fontSize: fontSizeBase,
            color: textPrimary,
            marginBottom: 4,
          }}
        >
          {recipe.title}
        </Text>

        {/* Metadata line */}
        {metadataLine ? (
          <Text
            style={{
              fontFamily: fontFamilyBody,
              fontSize: fontSizeSm,
              color: textSecondary,
            }}
          >
            {metadataLine}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

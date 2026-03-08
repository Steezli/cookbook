import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { getCollections } from '@/features/collections/api';
import type { CollectionWithRecipeCount } from '@/features/collections/types';
import { useSession } from '@/features/auth/session';
import { useBreakpoint } from '@/lib/hooks/useBreakpoint';
import { PageContainer } from '@/components/nav/PageContainer';
import {
  accentBlue,
  bgCard,
  fontFamilyBody,
  fontFamilyBodyMedium,
  fontFamilyDisplay,
  fontSize2xl,
  fontSizeBase,
  fontSizeSm,
  fontSizeXs,
  radiusMd,
  shadowSm,
  textPrimary,
  textSecondary,
  textTertiary,
  white,
} from '@/lib/tokens';

export default function CollectionsListScreen() {
  const { session } = useSession();
  const { breakpoint } = useBreakpoint();
  const [collections, setCollections] = useState<CollectionWithRecipeCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const numColumns = breakpoint === 'mobile' ? 1 : breakpoint === 'tablet' ? 2 : 3;

  async function loadCollections() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCollections();
      setCollections(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load collections');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadCollections();
  }, []);

  function renderCollectionCard({ item }: { item: CollectionWithRecipeCount }) {
    return (
      <Pressable
        onPress={() => router.push(`/collections/${item.id}` as any)}
        style={{
          flex: numColumns > 1 ? 1 : undefined,
          backgroundColor: bgCard,
          borderRadius: radiusMd,
          padding: 16,
          ...shadowSm,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            fontFamily: fontFamilyDisplay,
            fontSize: fontSizeBase,
            color: textPrimary,
            marginBottom: 4,
          }}
        >
          {item.name}
        </Text>
        {item.description ? (
          <Text
            numberOfLines={2}
            style={{
              fontFamily: fontFamilyBody,
              fontSize: fontSizeSm,
              color: textSecondary,
              marginBottom: 8,
            }}
          >
            {item.description}
          </Text>
        ) : null}
        <Text
          style={{
            fontFamily: fontFamilyBody,
            fontSize: fontSizeXs,
            color: textTertiary,
          }}
        >
          {item.recipe_count} {item.recipe_count === 1 ? 'recipe' : 'recipes'}
          {' \u00B7 '}
          {item.family_id ? 'Family' : 'Personal'}
        </Text>
      </Pressable>
    );
  }

  return (
    <PageContainer>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: 16,
        }}
      >
        <Text
          style={{
            fontFamily: fontFamilyDisplay,
            fontSize: fontSize2xl,
            color: textPrimary,
          }}
        >
          Collections
        </Text>
        {session && (
          <Pressable
            onPress={() => router.push('/collections/create' as any)}
            style={{
              backgroundColor: accentBlue,
              borderRadius: radiusMd,
              paddingHorizontal: 16,
              paddingVertical: 10,
            }}
          >
            <Text
              style={{
                fontFamily: fontFamilyBodyMedium,
                fontSize: fontSizeSm,
                color: white,
              }}
            >
              New Collection
            </Text>
          </Pressable>
        )}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={accentBlue} />
        </View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text
            style={{
              fontFamily: fontFamilyBody,
              fontSize: fontSizeSm,
              color: '#d32f2f',
              textAlign: 'center',
            }}
          >
            {error}
          </Text>
        </View>
      ) : collections.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text
            style={{
              fontFamily: fontFamilyBody,
              fontSize: fontSizeBase,
              color: textSecondary,
              textAlign: 'center',
              marginBottom: 16,
            }}
          >
            No collections yet
          </Text>
          {session && (
            <Pressable
              onPress={() => router.push('/collections/create' as any)}
              style={{
                backgroundColor: accentBlue,
                borderRadius: radiusMd,
                paddingHorizontal: 20,
                paddingVertical: 12,
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamilyBodyMedium,
                  fontSize: fontSizeSm,
                  color: white,
                }}
              >
                Create Your First Collection
              </Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={collections}
          keyExtractor={(item) => item.id}
          key={numColumns}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? { gap: 16 } : undefined}
          contentContainerStyle={{ gap: 16, paddingBottom: 32 }}
          renderItem={renderCollectionCard}
          style={
            breakpoint === 'web'
              ? { flexGrow: 1, flexBasis: 0 }
              : undefined
          }
        />
      )}
    </PageContainer>
  );
}

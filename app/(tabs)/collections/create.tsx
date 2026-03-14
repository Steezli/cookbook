import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import type { TextInput as TextInputType } from 'react-native';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { showAlert } from '@/lib/alert';
import { createCollection } from '@/features/collections/api';
import { supabase } from '@/lib/supabase';
import { useBreakpoint } from '@/lib/hooks/useBreakpoint';
import { PageContainer } from '@/components/nav/PageContainer';
import {
  accentBlue,
  borderDefault,
  fontFamilyBody,
  fontFamilyBodyMedium,
  fontFamilyDisplay,
  fontSize2xl,
  fontSizeBase,
  fontSizeSm,
  radiusMd,
  textPrimary,
  textSecondary,
  white,
} from '@/lib/tokens';

type Family = {
  id: string;
  name: string;
};

export default function CreateCollectionScreen() {
  const { breakpoint } = useBreakpoint();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [families, setFamilies] = useState<Family[]>([]);
  const descriptionRef = useRef<TextInputType>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isWide = breakpoint !== 'mobile';

  useEffect(() => {
    async function loadFamilies() {
      const { data, error } = await supabase
        .from('families')
        .select('id, name')
        .order('name');

      if (!error && data) {
        setFamilies(data);
      }
    }

    void loadFamilies();
  }, []);

  async function handleSubmit() {
    if (!name.trim()) {
      showAlert('Validation Error', 'Collection name is required');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const collection = await createCollection({
        name: name.trim(),
        description: description.trim() || undefined,
        family_id: familyId,
      });

      router.replace(`/collections/${collection.id}` as any);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create collection';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageContainer>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: 32,
          ...(isWide
            ? { maxWidth: 600, alignSelf: 'center' as const, width: '100%' }
            : {}),
        }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16 }}>
          <Pressable
            onPress={() => router.back()}
            style={{ marginRight: 12 }}
          >
            <Text
              style={{
                fontFamily: fontFamilyBody,
                fontSize: fontSizeBase,
                color: accentBlue,
              }}
            >
              Cancel
            </Text>
          </Pressable>
          <Text
            style={{
              fontFamily: fontFamilyDisplay,
              fontSize: fontSize2xl,
              color: textPrimary,
              flex: 1,
            }}
          >
            Create Collection
          </Text>
        </View>

        {/* Name */}
        <Text
          style={{
            fontFamily: fontFamilyBodyMedium,
            fontSize: fontSizeSm,
            color: textPrimary,
            marginBottom: 8,
            marginTop: 8,
          }}
        >
          Name *
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g., Holiday Favorites"
          returnKeyType="next"
          onSubmitEditing={() => descriptionRef.current?.focus()}
          style={{
            borderWidth: 1,
            borderColor: borderDefault,
            borderRadius: radiusMd,
            padding: 12,
            fontFamily: fontFamilyBody,
            fontSize: fontSizeBase,
            color: textPrimary,
          }}
        />

        {/* Description */}
        <Text
          style={{
            fontFamily: fontFamilyBodyMedium,
            fontSize: fontSizeSm,
            color: textPrimary,
            marginBottom: 8,
            marginTop: 20,
          }}
        >
          Description
        </Text>
        <TextInput
          ref={descriptionRef}
          value={description}
          onChangeText={setDescription}
          placeholder="Brief description"
          multiline
          numberOfLines={3}
          style={{
            borderWidth: 1,
            borderColor: borderDefault,
            borderRadius: radiusMd,
            padding: 12,
            fontFamily: fontFamilyBody,
            fontSize: fontSizeBase,
            color: textPrimary,
            minHeight: 80,
            textAlignVertical: 'top',
          }}
        />

        {/* Type selector */}
        <Text
          style={{
            fontFamily: fontFamilyBodyMedium,
            fontSize: fontSizeSm,
            color: textPrimary,
            marginBottom: 8,
            marginTop: 20,
          }}
        >
          Type
        </Text>
        <View style={{ gap: 10 }}>
          <Pressable
            onPress={() => setFamilyId(null)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: familyId === null ? accentBlue : borderDefault,
              borderRadius: radiusMd,
            }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: familyId === null ? accentBlue : borderDefault,
                backgroundColor: familyId === null ? accentBlue : 'transparent',
              }}
            />
            <Text
              style={{
                fontFamily: fontFamilyBody,
                fontSize: fontSizeBase,
                color: textPrimary,
              }}
            >
              Personal (only you)
            </Text>
          </Pressable>

          {families.map((family) => (
            <Pressable
              key={family.id}
              onPress={() => setFamilyId(family.id)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: familyId === family.id ? accentBlue : borderDefault,
                borderRadius: radiusMd,
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: familyId === family.id ? accentBlue : borderDefault,
                  backgroundColor: familyId === family.id ? accentBlue : 'transparent',
                }}
              />
              <Text
                style={{
                  fontFamily: fontFamilyBody,
                  fontSize: fontSizeBase,
                  color: textPrimary,
                }}
              >
                Family: {family.name}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Error message */}
        {errorMsg ? (
          <Text
            style={{
              fontFamily: fontFamilyBody,
              fontSize: fontSizeSm,
              color: '#d32f2f',
              marginTop: 16,
              textAlign: 'center',
            }}
          >
            {errorMsg}
          </Text>
        ) : null}

        {/* Submit */}
        <Pressable
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={{
            backgroundColor: accentBlue,
            borderRadius: radiusMd,
            paddingVertical: 14,
            alignItems: 'center',
            marginTop: 32,
            opacity: isSubmitting ? 0.5 : 1,
          }}
        >
          <Text
            style={{
              fontFamily: fontFamilyBodyMedium,
              fontSize: fontSizeBase,
              color: white,
            }}
          >
            {isSubmitting ? 'Creating...' : 'Create Collection'}
          </Text>
        </Pressable>
      </ScrollView>
    </PageContainer>
  );
}

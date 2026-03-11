import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react-native';
import { useBreakpoint } from '@/lib/hooks/useBreakpoint';
import { PublicSearchBar } from '@/components/public/PublicSearchBar';
import { getChipsForBreakpoint } from '@/components/public/publicNavHeaderUtils';
import {
  accentWarm,
  bgCard,
  bgCardWarm,
  borderDefault,
  borderSubtle,
  fontFamilyBodyMedium,
  fontFamilyDisplayBold,
  radiusPill,
  textPrimary,
  textSecondary,
  white,
} from '@/lib/tokens';

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function SignInButton() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push('/(auth)/login')}
      style={{
        height: 48,
        backgroundColor: bgCard,
        borderRadius: radiusPill,
        borderWidth: 1,
        borderColor: borderDefault,
        paddingHorizontal: 24,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontSize: 15,
          fontFamily: fontFamilyBodyMedium,
          color: textPrimary,
        }}
      >
        Sign In
      </Text>
    </Pressable>
  );
}

function GetStartedButton() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push('/(auth)/signup')}
      style={{
        backgroundColor: accentWarm,
        borderRadius: radiusPill,
        height: 48,
        paddingHorizontal: 24,
        paddingVertical: 12,
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontSize: 15,
          fontFamily: fontFamilyBodyMedium,
          color: white,
        }}
      >
        Get Started
      </Text>
      <ArrowRight size={16} color={white} />
    </Pressable>
  );
}

function LogoRow({
  iconSize,
  fontSize,
  gap: rowGap,
}: {
  iconSize: number;
  fontSize: number;
  gap: number;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: rowGap }}>
      <BookOpen size={iconSize} color={accentWarm} />
      <Text
        style={{
          fontSize,
          fontFamily: fontFamilyDisplayBold,
          color: textPrimary,
        }}
      >
        Cookbook
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Filter chips
// ---------------------------------------------------------------------------

function FilterChips({
  chips,
  selectedTag,
  onTagChange,
}: {
  chips: string[];
  selectedTag: string;
  onTagChange: (tag: string) => void;
}) {
  if (chips.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8 }}
    >
      {chips.map((tag) => {
        const isActive = tag === selectedTag;
        return (
          <Pressable
            key={tag}
            onPress={() => onTagChange(tag)}
            style={{
              backgroundColor: isActive ? accentWarm : bgCard,
              borderRadius: radiusPill,
              paddingHorizontal: 14,
              paddingVertical: 6,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontFamily: fontFamilyBodyMedium,
                color: isActive ? white : textSecondary,
              }}
            >
              {tag}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// PublicBrowseHeader
// ---------------------------------------------------------------------------

type PublicBrowseHeaderProps = {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedTag: string;
  onTagChange: (tag: string) => void;
};

export function PublicBrowseHeader({
  searchQuery,
  onSearchChange,
  selectedTag,
  onTagChange,
}: PublicBrowseHeaderProps) {
  const { breakpoint } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const chips = getChipsForBreakpoint(breakpoint);

  if (breakpoint === 'web') {
    return (
      <View
        style={{
          backgroundColor: bgCardWarm,
          paddingHorizontal: 48,
          paddingVertical: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <LogoRow iconSize={28} fontSize={22} gap={10} />
        <PublicSearchBar
          value={searchQuery}
          onChangeText={onSearchChange}
          style={{ width: 480 }}
        />
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <SignInButton />
          <GetStartedButton />
        </View>
      </View>
    );
  }

  if (breakpoint === 'tablet') {
    return (
      <View
        style={{
          backgroundColor: bgCardWarm,
          paddingHorizontal: 32,
          paddingTop: insets.top + 20,
          paddingBottom: 20,
          gap: 16,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <LogoRow iconSize={28} fontSize={22} gap={8} />
          <View
            style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}
          >
            <PublicSearchBar
              value={searchQuery}
              onChangeText={onSearchChange}
              style={{ width: 320 }}
            />
            <SignInButton />
          </View>
        </View>
        <FilterChips
          chips={chips}
          selectedTag={selectedTag}
          onTagChange={onTagChange}
        />
      </View>
    );
  }

  // Mobile layout
  return (
    <View
      style={{
        backgroundColor: bgCardWarm,
        paddingHorizontal: 24,
        paddingTop: insets.top + 16,
        paddingBottom: 16,
        gap: 16,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <LogoRow iconSize={24} fontSize={20} gap={8} />
        <SignInButton />
      </View>
      <PublicSearchBar
        value={searchQuery}
        onChangeText={onSearchChange}
      />
      <FilterChips
        chips={chips}
        selectedTag={selectedTag}
        onTagChange={onTagChange}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// PublicDetailNavBar
// ---------------------------------------------------------------------------

type PublicDetailNavBarProps = {
  onBack: () => void;
};

export function PublicDetailNavBar({ onBack }: PublicDetailNavBarProps) {
  const { breakpoint } = useBreakpoint();
  const insets = useSafeAreaInsets();

  if (breakpoint === 'web') {
    return (
      <View
        style={{
          paddingHorizontal: 48,
          paddingVertical: 12,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottomWidth: 1,
          borderBottomColor: borderSubtle,
          backgroundColor: white,
        }}
      >
        <LogoRow iconSize={28} fontSize={22} gap={10} />
        <PublicSearchBar
          value=""
          onChangeText={() => {}}
          style={{ width: 480 }}
        />
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <SignInButton />
          <GetStartedButton />
        </View>
      </View>
    );
  }

  if (breakpoint === 'tablet') {
    return (
      <View
        style={{
          paddingHorizontal: 32,
          paddingVertical: 12,
          paddingTop: insets.top + 12,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottomWidth: 1,
          borderBottomColor: borderSubtle,
          backgroundColor: white,
        }}
      >
        <Pressable
          onPress={onBack}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
        >
          <ArrowLeft size={20} color={textSecondary} />
          <Text
            style={{
              fontSize: 20,
              fontFamily: fontFamilyDisplayBold,
              color: textPrimary,
            }}
          >
            Cookbook
          </Text>
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <PublicSearchBar
            value=""
            onChangeText={() => {}}
            style={{ width: 260 }}
          />
          <SignInButton />
        </View>
      </View>
    );
  }

  // Mobile layout
  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingVertical: 10,
        paddingTop: insets.top + 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: borderSubtle,
        backgroundColor: white,
      }}
    >
      <Pressable
        onPress={onBack}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
      >
        <ArrowLeft size={20} color={textSecondary} />
        <Text
          style={{
            fontSize: 18,
            fontFamily: fontFamilyDisplayBold,
            color: textPrimary,
          }}
        >
          Cookbook
        </Text>
      </Pressable>
      <SignInButton />
    </View>
  );
}

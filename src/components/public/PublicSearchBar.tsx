import React from 'react';
import { TextInput, View } from 'react-native';
import { Search } from 'lucide-react-native';
import {
  bgCard,
  fontFamilyBody,
  textPrimary,
  textTertiary,
} from '@/lib/tokens';

type PublicSearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: object;
};

export function PublicSearchBar({
  value,
  onChangeText,
  placeholder = 'Search recipes...',
  style,
}: PublicSearchBarProps) {
  return (
    <View
      style={[
        {
          height: 48,
          backgroundColor: bgCard,
          borderRadius: 26,
          paddingHorizontal: 18,
          gap: 12,
          flexDirection: 'row',
          alignItems: 'center',
        },
        style,
      ]}
    >
      <Search size={18} color={textTertiary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={textTertiary}
        style={{
          flex: 1,
          fontSize: 15,
          fontFamily: fontFamilyBody,
          color: textPrimary,
        }}
      />
    </View>
  );
}

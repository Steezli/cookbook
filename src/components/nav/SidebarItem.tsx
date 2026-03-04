// Reusable sidebar navigation item for the web left sidebar.
// Accepts TabTriggerSlotProps via forwardRef so expo-router/ui can forward
// isFocused and press handlers when wrapped in <TabTrigger asChild>.
// Also usable as a plain Pressable (pass onPress directly, isFocused omitted).

import React from "react";
import { Pressable, Text, View } from "react-native";
import { TabTriggerSlotProps } from "expo-router/ui";
import {
  accentWarm,
  fontFamilyBodyMedium,
  fontSizeSm,
  radiusSm,
  textSecondary,
  white,
} from "@/lib/tokens";

type SidebarItemProps = TabTriggerSlotProps & {
  /** Lucide icon component instance, e.g. <LayoutGrid /> */
  icon: React.ReactNode;
  /** Navigation label displayed beside the icon */
  label: string;
};

export const SidebarItem = React.forwardRef<View, SidebarItemProps>(
  ({ isFocused, icon, label, onPress, onLongPress, ...rest }, ref) => {
    return (
      <Pressable
        ref={ref}
        onPress={onPress}
        onLongPress={onLongPress}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: radiusSm,
          backgroundColor: isFocused ? accentWarm : "transparent",
          width: "100%",
        }}
        {...rest}
      >
        {React.cloneElement(icon as React.ReactElement, {
          size: 20,
          color: isFocused ? white : textSecondary,
        })}
        <Text
          style={{
            color: isFocused ? white : textSecondary,
            fontSize: fontSizeSm,
            fontWeight: isFocused ? "600" : "500",
            fontFamily: fontFamilyBodyMedium,
          }}
        >
          {label}
        </Text>
      </Pressable>
    );
  }
);

SidebarItem.displayName = "SidebarItem";

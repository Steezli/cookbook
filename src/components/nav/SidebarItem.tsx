// Reusable sidebar navigation item for the web left sidebar.
// Accepts TabTriggerSlotProps so expo-router/ui can forward
// isFocused and press handlers when wrapped in <TabTrigger asChild>.
// Also usable as a plain Pressable (pass onPress directly, isFocused omitted).

import { cloneElement, type ReactElement, type ReactNode, type Ref } from "react";
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
  icon: ReactNode;
  /** Navigation label displayed beside the icon */
  label: string;
  ref?: Ref<View>;
};

export function SidebarItem({ isFocused, icon, label, onPress, onLongPress, ref, ...rest }: SidebarItemProps) {
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
      {cloneElement(icon as ReactElement<{ size: number; color: string }>, {
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

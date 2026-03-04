// Reusable tab button for the mobile/tablet bottom tab bar.
// Accepts TabTriggerSlotProps so expo-router/ui can forward
// isFocused and press handlers when wrapped in <TabTrigger asChild>.

import { cloneElement, type ReactElement, type ReactNode, type Ref } from "react";
import { Pressable, View } from "react-native";
import { TabTriggerSlotProps } from "expo-router/ui";
import { accentWarm, textDisabled } from "@/lib/tokens";

type TabButtonProps = TabTriggerSlotProps & {
  /** Lucide icon component instance, e.g. <Home /> */
  icon: ReactNode;
  ref?: Ref<View>;
};

export function TabButton({ isFocused, icon, onPress, onLongPress, ref }: TabButtonProps) {
  const iconColor = isFocused ? accentWarm : textDisabled;

  return (
    <Pressable
      ref={ref}
      onPress={onPress}
      onLongPress={onLongPress}
      style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
    >
      {cloneElement(icon as ReactElement<{ color: string; size: number }>, {
        color: iconColor,
        size: 24,
      })}
    </Pressable>
  );
}

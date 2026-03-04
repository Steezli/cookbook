// Reusable tab button for the mobile/tablet bottom tab bar.
// Accepts TabTriggerSlotProps via forwardRef so expo-router/ui can forward
// isFocused and press handlers when wrapped in <TabTrigger asChild>.

import React from "react";
import { Pressable, View } from "react-native";
import { TabTriggerSlotProps } from "expo-router/ui";
import { accentWarm, textDisabled } from "@/lib/tokens";

type TabButtonProps = TabTriggerSlotProps & {
  /** Lucide icon component instance, e.g. <Home /> */
  icon: React.ReactNode;
};

export const TabButton = React.forwardRef<View, TabButtonProps>(
  ({ isFocused, icon, onPress, onLongPress, ...rest }, ref) => {
    const iconColor = isFocused ? accentWarm : textDisabled;

    return (
      <Pressable
        ref={ref}
        onPress={onPress}
        onLongPress={onLongPress}
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
        {...rest}
      >
        {React.cloneElement(icon as React.ReactElement, {
          color: iconColor,
          size: 24,
        })}
      </Pressable>
    );
  }
);

TabButton.displayName = "TabButton";

import { Stack } from "expo-router";

import { SessionProvider } from "@/features/auth/session";

export default function RootLayout() {
  return (
    <SessionProvider>
      <Stack
        screenOptions={{
          headerTitle: "Cookbook"
        }}
      />
    </SessionProvider>
  );
}

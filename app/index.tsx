import { Redirect } from "expo-router";
import { useSession } from "@/features/auth/session";

export default function RootIndex() {
  const { session, isLoading } = useSession();

  if (isLoading) return null;

  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(public)" />;
}

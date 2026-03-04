// Dummy route file for the Scan tab.
// This screen is never rendered — the tab press is intercepted
// to open the (scan)/ modal via router.push("/(scan)").
// Required by expo-router/ui: TabTrigger needs a matching route file.
import { Redirect } from 'expo-router';
export default function ScanTabDummy() {
  return <Redirect href="/(scan)" />;
}

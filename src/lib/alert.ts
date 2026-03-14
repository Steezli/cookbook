import { Alert, Platform } from "react-native";

/**
 * Cross-platform alert/confirm helpers.
 *
 * `Alert.alert` is a silent no-op on react-native-web 0.21.
 * These wrappers branch on `Platform.OS` so every user-facing
 * message actually reaches the user on all platforms.
 *
 * Detection: `rg 'Alert\.alert' app/ src/` should return 0 matches.
 * Adoption:  `rg 'from.*@/lib/alert' app/ src/ -l | wc -l` tracks usage.
 */

/** Show a simple informational alert (no user action required). */
export function showAlert(title: string, message?: string): void {
  if (Platform.OS === "web") {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}

/** Show a confirmation dialog; calls `onConfirm` only if the user accepts. */
export function confirmAction(
  title: string,
  message: string,
  onConfirm: () => void,
): void {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", style: "destructive", onPress: onConfirm },
    ]);
  }
}

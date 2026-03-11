/**
 * Type declarations for expo-tracking-transparency.
 *
 * This module is an optional native dependency (only available on iOS builds).
 * The type declaration allows TypeScript to compile without the package installed.
 * The actual module is loaded dynamically at runtime via import().
 */
declare module 'expo-tracking-transparency' {
  export interface TrackingPermissionResponse {
    status: 'granted' | 'denied' | 'undetermined';
  }

  export function requestTrackingPermissionsAsync(): Promise<TrackingPermissionResponse>;
  export function getTrackingPermissionsAsync(): Promise<TrackingPermissionResponse>;
}

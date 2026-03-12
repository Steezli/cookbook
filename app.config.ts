import { ExpoConfig, ConfigContext } from 'expo/config';
import * as fs from 'fs';
import * as path from 'path';

// Only include the react-native-google-mobile-ads plugin when the package is
// actually installed (EAS Build). During local web dev the native-only package
// is absent, and Expo's plugin resolver crashes if it can't find it.
const admobInstalled = fs.existsSync(
  path.join(__dirname, 'node_modules', 'react-native-google-mobile-ads'),
);

const attInstalled = fs.existsSync(
  path.join(__dirname, 'node_modules', 'expo-tracking-transparency'),
);

export default ({ config }: ConfigContext): ExpoConfig => ({
  name: 'Berven',
  slug: 'berven',
  scheme: 'berven',
  version: '0.1.0',
  icon: './assets/icon.png',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#FFFBF5',
  },
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  assetBundlePatterns: ['**/*'],
  ios: {
    bundleIdentifier: 'com.steezli.berven',
    usesAppleSignIn: true,
    infoPlist: {
      NSUserTrackingUsageDescription:
        'Berven Book uses your device identifier to show you personalized ads. You can change this anytime in Settings.',
    },
  },
  android: {
    package: 'com.steezli.berven',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#E8784E',
    },
  },
  web: {
    bundler: 'metro',
  },
  plugins: [
    'expo-router',
    'expo-web-browser',
    'expo-apple-authentication',
    ...(attInstalled ? ['expo-tracking-transparency'] : []),
    ...(admobInstalled
      ? [
          [
            'react-native-google-mobile-ads',
            {
              androidAppId:
                process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID ||
                'ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy',
              iosAppId:
                process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID ||
                'ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy',
            },
          ] as const,
        ]
      : []),
  ],
  experiments: {
    typedRoutes: true,
  },
});

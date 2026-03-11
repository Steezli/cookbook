import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  name: 'Berven',
  slug: 'berven',
  scheme: 'berven',
  version: '0.1.0',
  icon: './assets/icon.png',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  assetBundlePatterns: ['**/*'],
  ios: {
    bundleIdentifier: 'com.steezli.berven',
    usesAppleSignIn: true,
  },
  android: {
    package: 'com.steezli.berven',
  },
  web: {
    bundler: 'metro',
  },
  plugins: [
    'expo-router',
    'expo-web-browser',
    'expo-apple-authentication',
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
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
});

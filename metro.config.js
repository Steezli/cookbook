const path = require('path');
const fs = require('fs');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// True when react-native-purchases is not installed (local dev / CI without EAS).
const purchasesInstalled = fs.existsSync(
  path.resolve(__dirname, 'node_modules/react-native-purchases'),
);

// Exclude agent tooling directories that write files on a polling interval.
// Without this, .bg-shell/manifest.json updates every ~2s trigger Fast Refresh.
config.resolver.blockList = [
  ...(config.resolver.blockList || []),
  /\.bg-shell\/.*/,
  /\.gsd\/.*/,
  /\.planning\/.*/,
];

// Redirect native-only packages to empty shims on web.
// Metro resolves dynamic import() at bundle time, so even code behind
// Platform.OS guards still pulls in native modules. These shims prevent
// "Importing native-only module" errors in the web bundle.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Redirect react-native-google-mobile-ads to an empty shim on web.
  if (platform === 'web' && moduleName === 'react-native-google-mobile-ads') {
    return {
      filePath: path.resolve(
        __dirname,
        'src/features/ads/shims/react-native-google-mobile-ads.web.js',
      ),
      type: 'sourceFile',
    };
  }

  // Redirect RevenueCat native SDKs to no-op shims on web or when the packages
  // are not installed. In EAS native builds the real packages are installed and
  // resolved normally by the fallback below.
  if (
    (platform === 'web' || !purchasesInstalled) &&
    moduleName === 'react-native-purchases'
  ) {
    return {
      filePath: path.resolve(
        __dirname,
        'src/features/subscriptions/shims/react-native-purchases.js',
      ),
      type: 'sourceFile',
    };
  }
  if (
    (platform === 'web' || !purchasesInstalled) &&
    moduleName === 'react-native-purchases-ui'
  ) {
    return {
      filePath: path.resolve(
        __dirname,
        'src/features/subscriptions/shims/react-native-purchases-ui.js',
      ),
      type: 'sourceFile',
    };
  }

  // Fall back to default resolution for everything else
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

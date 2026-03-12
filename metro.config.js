const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

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
  if (
    platform === 'web' &&
    moduleName === 'react-native-google-mobile-ads'
  ) {
    return {
      filePath: path.resolve(
        __dirname,
        'src/features/ads/shims/react-native-google-mobile-ads.web.js',
      ),
      type: 'sourceFile',
    };
  }
  // Fall back to default resolution for everything else
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

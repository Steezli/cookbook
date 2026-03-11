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

module.exports = config;

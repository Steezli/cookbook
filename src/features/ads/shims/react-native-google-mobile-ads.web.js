// Empty shim for react-native-google-mobile-ads on web.
// Metro resolves dynamic import() calls at bundle time, so even though
// consent.ts only imports this module behind a Platform.OS !== 'web' guard,
// the bundler still tries to include it. This shim provides a safe no-op
// so the web bundle compiles without pulling in native-only code.
module.exports = {};

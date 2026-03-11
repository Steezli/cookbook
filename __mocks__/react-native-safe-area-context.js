// Minimal mock for react-native-safe-area-context in Jest node environment.
module.exports = {
  SafeAreaProvider: 'SafeAreaProvider',
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
};

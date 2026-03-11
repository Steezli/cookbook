// Minimal react-native mock for Jest node environment.
// Provides only what nav component tests require.
const React = require('react');

module.exports = {
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  Pressable: 'Pressable',
  StyleSheet: {
    create: (styles) => styles,
    flatten: (style) => (Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style),
  },
  useWindowDimensions: () => ({ width: 375, height: 812 }),
  Platform: { OS: 'ios', select: (obj) => obj.ios || obj.default },
};

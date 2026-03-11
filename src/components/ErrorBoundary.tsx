import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  accentWarm,
  bgPage,
  fontFamilyBody,
  fontFamilyBodyBold,
  fontFamilyDisplay,
  fontSize2xl,
  fontSizeBase,
  fontSizeLg,
  radiusPill,
  textPrimary,
  textSecondary,
  white,
} from '@/lib/tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// ---------------------------------------------------------------------------
// ErrorBoundary
// ---------------------------------------------------------------------------

/**
 * Root-level error boundary for the app.
 *
 * Must be a class component — functional components cannot use
 * `componentDidCatch` or `getDerivedStateFromError`.
 *
 * Catches unhandled JS errors in the component tree below it,
 * renders a styled fallback with a "Try Again" recovery button,
 * and logs the error + component stack for debugging.
 *
 * Observability: logs `[ErrorBoundary]` with error and componentStack
 * to console.error. A future agent can inspect browser DevTools console
 * for these entries to locate the crashing component.
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, errorInfo.componentStack);
  }

  private handleTryAgain = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>⚠️</Text>
          <Text style={styles.heading}>Something went wrong</Text>
          <Text style={styles.description}>
            An unexpected error occurred. Tap the button below to try again.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
            onPress={this.handleTryAgain}
            accessibilityRole="button"
            accessibilityLabel="Try Again"
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Styles — all values from design tokens
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: bgPage,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  heading: {
    fontFamily: fontFamilyDisplay,
    fontSize: fontSize2xl,
    color: textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontFamily: fontFamilyBody,
    fontSize: fontSizeBase,
    color: textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    maxWidth: 320,
  },
  button: {
    backgroundColor: accentWarm,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: radiusPill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    fontFamily: fontFamilyBodyBold,
    fontSize: fontSizeLg,
    color: white,
  },
});

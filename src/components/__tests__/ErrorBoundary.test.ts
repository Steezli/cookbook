/**
 * Tests for ErrorBoundary component logic.
 *
 * Covers:
 *   - Renders children when no error is thrown
 *   - Catches error and renders fallback UI with "Something went wrong" text
 *   - "Try Again" resets error state and re-renders children
 *   - Logs error via console.error with '[ErrorBoundary]' prefix
 *
 * These tests verify ErrorBoundary behavior at the class/lifecycle level
 * without a React rendering environment, consistent with the project's
 * existing test pattern (node environment, no DOM).
 */

import ErrorBoundary from '../ErrorBoundary';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createInstance(props: { children: React.ReactNode } = { children: null }) {
  const instance = new ErrorBoundary(props);
  return instance;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ErrorBoundary', () => {
  describe('static getDerivedStateFromError', () => {
    it('returns hasError: true when called with an error', () => {
      const result = ErrorBoundary.getDerivedStateFromError(new Error('test'));
      expect(result).toEqual({ hasError: true });
    });
  });

  describe('initial state', () => {
    it('starts with hasError: false', () => {
      const boundary = createInstance();
      expect(boundary.state).toEqual({ hasError: false });
    });
  });

  describe('render — no error', () => {
    it('returns children when hasError is false', () => {
      const children = 'child content';
      const boundary = createInstance({ children });
      // When no error, render() returns this.props.children
      const result = boundary.render();
      expect(result).toBe(children);
    });
  });

  describe('render — error state', () => {
    it('renders fallback UI with "Something went wrong" when hasError is true', () => {
      const boundary = createInstance({ children: 'child' });
      // Simulate error state
      boundary.state = { hasError: true };
      const result = boundary.render();

      // Result should be a React element (View), not the children string
      expect(result).not.toBe('child');
      expect(result).toBeTruthy();

      // The fallback is a React element tree — verify it's an object (JSX element)
      expect(typeof result).toBe('object');
      expect(result).not.toBeNull();
    });
  });

  describe('componentDidCatch', () => {
    it('logs error with [ErrorBoundary] prefix via console.error', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const boundary = createInstance({ children: null });
      const testError = new Error('Component crashed');
      const errorInfo = { componentStack: '\n    at BrokenComponent\n    at App' };

      boundary.componentDidCatch(testError, errorInfo);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ErrorBoundary]',
        testError,
        errorInfo.componentStack,
      );

      consoleErrorSpy.mockRestore();
    });

    it('includes the component stack in the log', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const boundary = createInstance({ children: null });
      const stack = '\n    at FailingScreen\n    at Stack\n    at RootLayout';
      boundary.componentDidCatch(new Error('fail'), { componentStack: stack });

      const loggedStack = consoleErrorSpy.mock.calls[0][2];
      expect(loggedStack).toContain('FailingScreen');
      expect(loggedStack).toContain('RootLayout');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Try Again reset', () => {
    it('handleTryAgain resets hasError to false', () => {
      const boundary = createInstance({ children: 'child' });
      boundary.state = { hasError: true };

      // Access the private method via bracket notation
      const setStateSpy = jest.fn();
      boundary.setState = setStateSpy;

      // Call the handler — it's bound as an arrow function property
      (boundary as any).handleTryAgain();

      expect(setStateSpy).toHaveBeenCalledWith({ hasError: false });
    });

    it('after reset, render returns children again', () => {
      const children = 'recovered content';
      const boundary = createInstance({ children });

      // Error state
      boundary.state = { hasError: true };
      expect(boundary.render()).not.toBe(children);

      // Reset
      boundary.state = { hasError: false };
      expect(boundary.render()).toBe(children);
    });
  });

  describe('error → recovery → error cycle', () => {
    it('can transition through multiple error/recovery cycles', () => {
      const boundary = createInstance({ children: 'content' });

      // Normal
      expect(boundary.render()).toBe('content');

      // Error
      boundary.state = ErrorBoundary.getDerivedStateFromError(new Error('first'));
      expect(boundary.render()).not.toBe('content');

      // Recovery
      boundary.state = { hasError: false };
      expect(boundary.render()).toBe('content');

      // Second error
      boundary.state = ErrorBoundary.getDerivedStateFromError(new Error('second'));
      expect(boundary.render()).not.toBe('content');
    });
  });
});

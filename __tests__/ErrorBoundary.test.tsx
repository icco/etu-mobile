/**
 * @format
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import ErrorBoundary from '../src/components/ErrorBoundary';

// Component that throws an error
const ThrowError = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <Text>No error</Text>;
};

describe('ErrorBoundary', () => {
  // Suppress console.error for these tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeTruthy();
  });

  it('renders error UI when an error is caught', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Something went wrong/i)).toBeTruthy();
  });

  it('displays error message in error UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Test error/i)).toBeTruthy();
  });

  it('provides a way to retry after error', () => {
    const { getByText, rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Error UI should be shown
    expect(getByText(/Something went wrong/i)).toBeTruthy();

    // After retry, if component no longer throws, should render normally
    // Note: In real implementation, clicking "Try Again" would reset the boundary
    // This test just verifies the button exists
    const retryButton = getByText(/Try Again/i);
    expect(retryButton).toBeTruthy();
  });
});

/**
 * Test Utilities for RAVETURE Frontend
 *
 * This file provides custom render functions and utilities for testing React components
 * with all necessary providers (Router, Auth, etc.)
 */

import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ReactElement, ReactNode } from 'react';

/**
 * Custom render options
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  /**
   * Initial route for MemoryRouter (if not provided, uses BrowserRouter)
   */
  initialRoute?: string;
  /**
   * Initial auth state
   */
  authState?: {
    user: any;
    token: string;
    refreshToken: string;
  } | null;
}

/**
 * Providers wrapper for tests
 */
interface ProvidersProps {
  children: ReactNode;
  initialRoute?: string;
  authState?: CustomRenderOptions['authState'];
}

function Providers({ children, initialRoute, authState }: ProvidersProps) {
  // Mock localStorage for auth state
  if (authState) {
    window.localStorage.setItem('access_token', authState.token);
    window.localStorage.setItem('refresh_token', authState.refreshToken);
    window.localStorage.setItem('user', JSON.stringify(authState.user));
  } else {
    window.localStorage.clear();
  }

  const Router = initialRoute ? MemoryRouter : BrowserRouter;
  const routerProps = initialRoute ? { initialEntries: [initialRoute] } : {};

  return (
    <Router {...routerProps}>
      <AuthProvider>{children}</AuthProvider>
    </Router>
  );
}

/**
 * Custom render function that includes all providers
 *
 * @example
 * ```tsx
 * const { getByText } = renderWithProviders(<MyComponent />);
 * expect(getByText('Hello')).toBeInTheDocument();
 * ```
 *
 * @example With initial route
 * ```tsx
 * const { getByText } = renderWithProviders(<MyComponent />, {
 *   initialRoute: '/events/psychosound-2026'
 * });
 * ```
 *
 * @example With authenticated user
 * ```tsx
 * const { getByText } = renderWithProviders(<MyComponent />, {
 *   authState: {
 *     user: { id: 1, email: 'test@test.com' },
 *     token: 'mock-token',
 *     refreshToken: 'mock-refresh-token'
 *   }
 * });
 * ```
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: CustomRenderOptions
): RenderResult {
  const { initialRoute, authState, ...renderOptions } = options || {};

  return render(ui, {
    wrapper: ({ children }) => (
      <Providers initialRoute={initialRoute} authState={authState}>
        {children}
      </Providers>
    ),
    ...renderOptions,
  });
}

/**
 * Creates a mock authenticated user for testing
 */
export function createMockAuthState(overrides?: any) {
  return {
    user: {
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      is_organizer: false,
      ...overrides?.user,
    },
    token: 'mock-access-token-12345',
    refreshToken: 'mock-refresh-token-67890',
    ...overrides,
  };
}

/**
 * Creates a mock organizer auth state
 */
export function createMockOrganizerAuthState(overrides?: any) {
  return createMockAuthState({
    user: {
      is_organizer: true,
      organizer_id: 1,
      ...overrides?.user,
    },
    ...overrides,
  });
}

/**
 * Wait for async operations to complete
 * Useful for testing components with useEffect
 */
export const waitForAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Mock window.scrollTo (not implemented in jsdom)
 */
export function mockScrollTo() {
  window.scrollTo = vi.fn();
}

/**
 * Mock window.location
 */
export function mockWindowLocation(url: string) {
  delete (window as any).location;
  window.location = new URL(url) as any;
}

/**
 * Create a mock file for upload testing
 */
export function createMockFile(
  name: string = 'test.jpg',
  size: number = 1024,
  type: string = 'image/jpeg'
): File {
  const file = new File(['(binary data)'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

/**
 * Re-export everything from React Testing Library
 */
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

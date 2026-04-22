/**
 * Login Component Tests
 *
 * Tests authentication login functionality including:
 * - Form rendering and validation
 * - Successful login flow
 * - Error handling
 * - Password visibility toggle
 * - Navigation
 *
 * @see docs/tests/frontend/AUTH_TESTS.md for detailed documentation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, userEvent } from '@/test/utils/test-utils';
import { Login } from './Login';
import { mockUsers } from '@/test/mocks/mockData';

// Hoisted mocks so they are available inside vi.mock factories
const { mockLogin, mockNavigate, mockAuthState } = vi.hoisted(() => {
  const mockLogin = vi.fn();
  return {
    mockLogin,
    mockNavigate: vi.fn(),
    mockAuthState: {
      user: null as any,
      userId: null as string | null,
      isAuthenticated: false,
      isLoading: false,
      login: mockLogin,
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    },
  };
});

// Passthrough AuthProvider + controllable useAuth — bypasses real init/loading gate
vi.mock('@/context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => mockAuthState,
}));

// GSAP — no-op, callback isn't executed so gsap.fromTo never fires
vi.mock('gsap', () => ({
  default: {
    timeline: () => ({ fromTo: vi.fn().mockReturnThis() }),
    fromTo: vi.fn(),
  },
}));
vi.mock('@gsap/react', () => ({
  useGSAP: vi.fn(),
}));

// Preserve BrowserRouter/Link/useSearchParams; replace useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default auth state before each test
    mockAuthState.user = null;
    mockAuthState.userId = null;
    mockAuthState.isAuthenticated = false;
    mockAuthState.isLoading = false;
  });

  describe('Rendering', () => {
    it('should render login form with all fields', () => {
      renderWithProviders(<Login />);

      // Logo appears in the issue strip
      expect(screen.getByRole('link', { name: 'RAVETURE' })).toBeInTheDocument();

      // Header copy from translations.en
      expect(screen.getByText('Welcome back.')).toBeInTheDocument();
      expect(screen.getByText('Sign in to access your tickets and events.')).toBeInTheDocument();

      // Form fields (labels are rendered as <span> inside <label>, implicit association)
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();

      // Submit button
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();

      // Register link
      expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /register/i })).toBeInTheDocument();
    });

    it('should render back to home link', () => {
      renderWithProviders(<Login />);

      const homeLink = screen.getByRole('link', { name: 'RAVETURE' });
      expect(homeLink).toHaveAttribute('href', '/');
    });
  });

  describe('Form Validation', () => {
    it('should show error when submitting empty form', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Login />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please fill in all fields')).toBeInTheDocument();
      });

      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should show error when email is missing', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Login />);

      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please fill in all fields')).toBeInTheDocument();
      });

      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should show error when password is missing', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Login />);

      const emailInput = screen.getByLabelText('Email');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please fill in all fields')).toBeInTheDocument();
      });

      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should clear error message when user starts typing', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Login />);

      const emailInput = screen.getByLabelText('Email');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Trigger error
      await user.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText('Please fill in all fields')).toBeInTheDocument();
      });

      // Start typing - error should disappear
      await user.type(emailInput, 't');
      await waitFor(() => {
        expect(screen.queryByText('Please fill in all fields')).not.toBeInTheDocument();
      });
    });
  });

  describe('Successful Login', () => {
    it('should call login function with correct credentials', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValueOnce(undefined);

      renderWithProviders(<Login />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, mockUsers.regular.email);
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith(mockUsers.regular.email, 'password123');
      });
    });

    it('should navigate to home page after successful login', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValueOnce(undefined);

      renderWithProviders(<Login />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, mockUsers.regular.email);
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    it('should not show any error message after successful login', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValueOnce(undefined);

      renderWithProviders(<Login />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, mockUsers.regular.email);
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });

      expect(screen.queryByText('Please fill in all fields')).not.toBeInTheDocument();
      expect(screen.queryByText('Login failed. Please check your credentials.')).not.toBeInTheDocument();
    });
  });

  describe('Failed Login', () => {
    it('should show error message when login fails with message property', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Invalid credentials';
      mockLogin.mockRejectedValueOnce({ message: errorMessage });

      renderWithProviders(<Login />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'wrong@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should show error message when login fails with error property', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Authentication failed';
      mockLogin.mockRejectedValueOnce({ error: errorMessage });

      renderWithProviders(<Login />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'wrong@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should show generic error message for unknown errors', async () => {
      const user = userEvent.setup();
      // Reject with a string — no .message/.error property on the value
      mockLogin.mockRejectedValueOnce('boom');

      renderWithProviders(<Login />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Login failed. Please check your credentials.')).toBeInTheDocument();
      });
    });

    it('should not navigate when login fails', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValueOnce({ message: 'Invalid credentials' });

      renderWithProviders(<Login />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'wrong@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility when clicking the eye icon', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Login />);

      const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;

      // Initially password should be hidden
      expect(passwordInput.type).toBe('password');

      // Find and click the toggle button
      const toggleButton = screen.getByRole('button', { name: /show password/i });
      await user.click(toggleButton);

      // Password should now be visible
      await waitFor(() => {
        expect(passwordInput.type).toBe('text');
      });

      // Click again to hide (aria-label flips to 'Hide password')
      const hideButton = screen.getByRole('button', { name: /hide password/i });
      await user.click(hideButton);

      await waitFor(() => {
        expect(passwordInput.type).toBe('password');
      });
    });
  });

  describe('Loading State', () => {
    it('should disable submit button when loading', () => {
      mockAuthState.isLoading = true;

      renderWithProviders(<Login />);

      const submitButton = screen.getByRole('button', { name: /signing in/i });
      expect(submitButton).toBeDisabled();
    });

    it('should show loading indicator when isLoading is true', () => {
      mockAuthState.isLoading = true;

      renderWithProviders(<Login />);

      // Button text changes to 'Signing in...' when loading
      expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument();
    });
  });

  describe('Navigation Links', () => {
    it('should have link to registration page', () => {
      renderWithProviders(<Login />);

      const registerLink = screen.getByRole('link', { name: /register/i });
      expect(registerLink).toHaveAttribute('href', '/register');
    });

    it('should have link to forgot password page', () => {
      renderWithProviders(<Login />);

      const forgotPasswordLink = screen.getByRole('link', { name: /forgot password/i });
      expect(forgotPasswordLink).toHaveAttribute('href', '/forgot-password');
    });
  });
});

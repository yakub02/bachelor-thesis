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
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, userEvent } from '@/test/utils/test-utils';
import { Login } from './Login';
import { mockUsers } from '@/test/mocks/mockData';
import * as authContext from '@/context/AuthContext';

// Mock GSAP to prevent animation-related issues in tests
vi.mock('gsap', () => ({
  default: {
    timeline: () => ({
      fromTo: vi.fn().mockReturnThis(),
    }),
  },
}));

vi.mock('@gsap/react', () => ({
  useGSAP: vi.fn(),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Login Component', () => {
  const mockLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();

    // Mock useAuth hook
    vi.spyOn(authContext, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: mockLogin,
      logout: vi.fn(),
      register: vi.fn(),
      refreshAccessToken: vi.fn(),
    });
  });

  describe('Rendering', () => {
    it('should render login form with all fields', () => {
      renderWithProviders(<Login />);

      // Check for logo
      expect(screen.getByText('RAVETURE')).toBeInTheDocument();

      // Check for header
      expect(screen.getByText('Welcome Back')).toBeInTheDocument();
      expect(screen.getByText('Sign in to access your account')).toBeInTheDocument();

      // Check for form fields
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();

      // Check for submit button
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();

      // Check for register link
      expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /register/i })).toBeInTheDocument();
    });

    it('should render back to home link', () => {
      renderWithProviders(<Login />);

      const homeLink = screen.getByRole('link', { name: /RAVETURE/i });
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

      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
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
      mockLogin.mockRejectedValueOnce(new Error());

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

      // Click again to hide
      await user.click(toggleButton);

      // Password should be hidden again
      await waitFor(() => {
        expect(passwordInput.type).toBe('password');
      });
    });
  });

  describe('Loading State', () => {
    it('should disable submit button when loading', () => {
      vi.spyOn(authContext, 'useAuth').mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
        login: mockLogin,
        logout: vi.fn(),
        register: vi.fn(),
        refreshAccessToken: vi.fn(),
      });

      renderWithProviders(<Login />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toBeDisabled();
    });

    it('should show loading indicator when isLoading is true', () => {
      vi.spyOn(authContext, 'useAuth').mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
        login: mockLogin,
        logout: vi.fn(),
        register: vi.fn(),
        refreshAccessToken: vi.fn(),
      });

      renderWithProviders(<Login />);

      // Check for loading spinner or text
      expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled();
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

/**
 * Register Component Tests
 *
 * Tests user registration functionality including:
 * - Form rendering
 * - All validation rules (password strength, username format)
 * - Successful registration flow
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, userEvent } from '@/test/utils/test-utils';
import { Register } from './Register';
import * as authContext from '@/context/AuthContext';

vi.mock('gsap', () => ({
  default: { timeline: () => ({ fromTo: vi.fn().mockReturnThis() }) },
}));

vi.mock('@gsap/react', () => ({ useGSAP: vi.fn() }));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// Replace AuthProvider with a simple pass-through so children render immediately
// without waiting for async token verification
vi.mock('@/context/AuthContext', async () => {
  const actual = await vi.importActual('@/context/AuthContext');
  return { ...actual, AuthProvider: ({ children }: any) => children };
});

describe('Register Component', () => {
  const mockRegister = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(authContext, 'useAuth').mockReturnValue({
      user: null,
      userId: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: mockRegister,
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });
  });

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  describe('Rendering', () => {
    it('should render brand name', () => {
      renderWithProviders(<Register />);
      expect(screen.getByText('RAVETURE')).toBeInTheDocument();
    });

    it('should render page title', () => {
      renderWithProviders(<Register />);
      expect(screen.getByText('Join the Movement')).toBeInTheDocument();
    });

    it('should render all form inputs', () => {
      renderWithProviders(<Register />);
      expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('your_username')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('How should we call you?')).toBeInTheDocument();
      // Two password fields share the same placeholder text
      const passwordInputs = screen.getAllByPlaceholderText(/min\. 8 chars/i);
      expect(passwordInputs).toHaveLength(1);
      expect(screen.getByPlaceholderText('Repeat your password')).toBeInTheDocument();
    });

    it('should render submit button', () => {
      renderWithProviders(<Register />);
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('should render link to login page', () => {
      renderWithProviders(<Register />);
      const loginLink = screen.getByRole('link', { name: /sign in/i });
      expect(loginLink).toHaveAttribute('href', '/login');
    });

    it('should render back to home link', () => {
      renderWithProviders(<Register />);
      const homeLink = screen.getByRole('link', { name: /RAVETURE/i });
      expect(homeLink).toHaveAttribute('href', '/');
    });
  });

  // ---------------------------------------------------------------------------
  // Validation — required fields
  // ---------------------------------------------------------------------------

  describe('Required fields validation', () => {
    it('should show error when submitting empty form', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Register />);

      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText('Please fill in all fields')).toBeInTheDocument();
      });
      expect(mockRegister).not.toHaveBeenCalled();
    });

    it('should show error when email is missing', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Register />);

      await user.type(screen.getByPlaceholderText('your_username'), 'testuser');
      await user.type(screen.getAllByPlaceholderText(/min\. 8 chars/i)[0], 'SecurePass1');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText('Please fill in all fields')).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Validation — password rules
  // ---------------------------------------------------------------------------

  describe('Password validation', () => {
    async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>, password: string, confirm: string) {
      await user.type(screen.getByPlaceholderText('your@email.com'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('your_username'), 'testuser');
      await user.type(screen.getAllByPlaceholderText(/min\. 8 chars/i)[0], password);
      await user.type(screen.getByPlaceholderText('Repeat your password'), confirm);
      await user.click(screen.getByRole('button', { name: /create account/i }));
    }

    it('should reject password shorter than 8 characters', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Register />);

      await fillRequiredFields(user, 'Short1', 'Short1');

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
      });
      expect(mockRegister).not.toHaveBeenCalled();
    });

    it('should reject password without uppercase letter', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Register />);

      await fillRequiredFields(user, 'nouppercase1', 'nouppercase1');

      await waitFor(() => {
        expect(screen.getByText('Password must contain at least one uppercase letter')).toBeInTheDocument();
      });
    });

    it('should reject password without lowercase letter', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Register />);

      await fillRequiredFields(user, 'NOLOWERCASE1', 'NOLOWERCASE1');

      await waitFor(() => {
        expect(screen.getByText('Password must contain at least one lowercase letter')).toBeInTheDocument();
      });
    });

    it('should reject password without number', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Register />);

      await fillRequiredFields(user, 'NoNumberHere', 'NoNumberHere');

      await waitFor(() => {
        expect(screen.getByText('Password must contain at least one number')).toBeInTheDocument();
      });
    });

    it('should reject mismatched passwords', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Register />);

      await fillRequiredFields(user, 'SecurePass1', 'DifferentPass1');

      await waitFor(() => {
        expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Validation — username rules
  // ---------------------------------------------------------------------------

  describe('Username validation', () => {
    async function fillWithUsername(user: ReturnType<typeof userEvent.setup>, username: string) {
      await user.type(screen.getByPlaceholderText('your@email.com'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('your_username'), username);
      await user.type(screen.getAllByPlaceholderText(/min\. 8 chars/i)[0], 'SecurePass1');
      await user.type(screen.getByPlaceholderText('Repeat your password'), 'SecurePass1');
      await user.click(screen.getByRole('button', { name: /create account/i }));
    }

    it('should reject username shorter than 3 characters', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Register />);

      await fillWithUsername(user, 'ab');

      await waitFor(() => {
        expect(screen.getByText('Username must be at least 3 characters')).toBeInTheDocument();
      });
    });

    it('should reject username with invalid characters', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Register />);

      await fillWithUsername(user, 'invalid-name!');

      await waitFor(() => {
        expect(
          screen.getByText('Username can only contain letters, numbers, and underscores')
        ).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Successful registration
  // ---------------------------------------------------------------------------

  describe('Successful registration', () => {
    it('should call register with correct data', async () => {
      const user = userEvent.setup();
      mockRegister.mockResolvedValueOnce(undefined);
      renderWithProviders(<Register />);

      await user.type(screen.getByPlaceholderText('your@email.com'), 'new@example.com');
      await user.type(screen.getByPlaceholderText('your_username'), 'newuser');
      await user.type(screen.getAllByPlaceholderText(/min\. 8 chars/i)[0], 'SecurePass1');
      await user.type(screen.getByPlaceholderText('Repeat your password'), 'SecurePass1');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          email: 'new@example.com',
          username: 'newuser',
          password: 'SecurePass1',
          display_name: undefined,
        });
      });
    });

    it('should navigate to home page after successful registration', async () => {
      const user = userEvent.setup();
      mockRegister.mockResolvedValueOnce(undefined);
      renderWithProviders(<Register />);

      await user.type(screen.getByPlaceholderText('your@email.com'), 'new@example.com');
      await user.type(screen.getByPlaceholderText('your_username'), 'newuser');
      await user.type(screen.getAllByPlaceholderText(/min\. 8 chars/i)[0], 'SecurePass1');
      await user.type(screen.getByPlaceholderText('Repeat your password'), 'SecurePass1');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    it('should include display name when provided', async () => {
      const user = userEvent.setup();
      mockRegister.mockResolvedValueOnce(undefined);
      renderWithProviders(<Register />);

      await user.type(screen.getByPlaceholderText('your@email.com'), 'new@example.com');
      await user.type(screen.getByPlaceholderText('your_username'), 'newuser');
      await user.type(screen.getByPlaceholderText('How should we call you?'), 'New User');
      await user.type(screen.getAllByPlaceholderText(/min\. 8 chars/i)[0], 'SecurePass1');
      await user.type(screen.getByPlaceholderText('Repeat your password'), 'SecurePass1');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith(
          expect.objectContaining({ display_name: 'New User' })
        );
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Failed registration
  // ---------------------------------------------------------------------------

  describe('Failed registration', () => {
    async function submitValidForm(user: ReturnType<typeof userEvent.setup>) {
      await user.type(screen.getByPlaceholderText('your@email.com'), 'new@example.com');
      await user.type(screen.getByPlaceholderText('your_username'), 'newuser');
      await user.type(screen.getAllByPlaceholderText(/min\. 8 chars/i)[0], 'SecurePass1');
      await user.type(screen.getByPlaceholderText('Repeat your password'), 'SecurePass1');
      await user.click(screen.getByRole('button', { name: /create account/i }));
    }

    it('should show API error message', async () => {
      const user = userEvent.setup();
      mockRegister.mockRejectedValueOnce({ message: 'Email already registered' });
      renderWithProviders(<Register />);

      await submitValidForm(user);

      await waitFor(() => {
        expect(screen.getByText('Email already registered')).toBeInTheDocument();
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should show error property from rejection', async () => {
      const user = userEvent.setup();
      mockRegister.mockRejectedValueOnce({ error: 'Username taken' });
      renderWithProviders(<Register />);

      await submitValidForm(user);

      await waitFor(() => {
        expect(screen.getByText('Username taken')).toBeInTheDocument();
      });
    });

    it('should show generic error for unknown failures', async () => {
      const user = userEvent.setup();
      // Throw a plain string — has no 'message' or 'error' property, triggers fallback
      mockRegister.mockRejectedValueOnce('unexpected_failure');
      renderWithProviders(<Register />);

      await submitValidForm(user);

      await waitFor(() => {
        expect(screen.getByText('Registration failed. Please try again.')).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  describe('Loading state', () => {
    it('should disable submit button when isLoading is true', () => {
      vi.spyOn(authContext, 'useAuth').mockReturnValue({
        user: null,
        userId: null,
        isAuthenticated: false,
        isLoading: true,
        login: vi.fn(),
        register: mockRegister,
        logout: vi.fn(),
        refreshUser: vi.fn(),
      });

      renderWithProviders(<Register />);

      expect(screen.getByRole('button', { name: /creating account/i })).toBeDisabled();
    });
  });
});

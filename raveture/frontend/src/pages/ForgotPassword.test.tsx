/**
 * ForgotPassword Component Tests
 *
 * Tests password reset request flow including:
 * - Form rendering
 * - Email validation
 * - Successful submit → success state
 * - API error handling
 * - Navigation links
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders, userEvent } from '@/test/utils/test-utils';
import { ForgotPassword } from './ForgotPassword';

vi.mock('gsap', () => ({
  default: { timeline: () => ({ fromTo: vi.fn().mockReturnThis() }) },
}));

vi.mock('@gsap/react', () => ({ useGSAP: vi.fn() }));

// Replace AuthProvider with pass-through (avoids async init blocking children render)
vi.mock('@/context/AuthContext', async () => {
  const actual = await vi.importActual('@/context/AuthContext');
  return { ...actual, AuthProvider: ({ children }: any) => children };
});

// Hoist mock functions so they are available inside vi.mock factory
const { mockForgotPassword } = vi.hoisted(() => ({
  mockForgotPassword: vi.fn(),
}));

vi.mock('@/services', () => ({
  ravetureApi: { forgotPassword: mockForgotPassword },
  ticketingApi: { setAuth: vi.fn() },
}));

describe('ForgotPassword Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  describe('Rendering', () => {
    it('should render brand name', () => {
      renderWithProviders(<ForgotPassword />);
      expect(screen.getByText('RAVETURE')).toBeInTheDocument();
    });

    it('should render page title', () => {
      renderWithProviders(<ForgotPassword />);
      expect(screen.getByText('Reset your password')).toBeInTheDocument();
    });

    it('should render email input', () => {
      renderWithProviders(<ForgotPassword />);
      expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument();
    });

    it('should render submit button', () => {
      renderWithProviders(<ForgotPassword />);
      expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
    });

    it('should render back to login link', () => {
      renderWithProviders(<ForgotPassword />);
      const links = screen.getAllByRole('link', { name: /back to login/i });
      expect(links.length).toBeGreaterThan(0);
      expect(links[0]).toHaveAttribute('href', '/login');
    });

    it('should render link back to home', () => {
      renderWithProviders(<ForgotPassword />);
      const homeLink = screen.getByRole('link', { name: /RAVETURE/i });
      expect(homeLink).toHaveAttribute('href', '/');
    });
  });

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  describe('Email validation', () => {
    it('should disable submit button when email field is empty', () => {
      renderWithProviders(<ForgotPassword />);
      expect(screen.getByRole('button', { name: /send reset link/i })).toBeDisabled();
    });

    it('should enable submit button when email is typed', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ForgotPassword />);

      await user.type(screen.getByPlaceholderText('your@email.com'), 'test@example.com');

      expect(screen.getByRole('button', { name: /send reset link/i })).not.toBeDisabled();
    });

    it('should show error for invalid email format', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ForgotPassword />);

      await user.type(screen.getByPlaceholderText('your@email.com'), 'not-an-email');

      // fireEvent.submit bypasses native HTML5 email validation so our JS validator runs
      const form = screen.getByPlaceholderText('your@email.com').closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
      });
      expect(mockForgotPassword).not.toHaveBeenCalled();
    });

    it('should clear error when user types in the field', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ForgotPassword />);

      await user.type(screen.getByPlaceholderText('your@email.com'), 'not-an-email');
      const form = screen.getByPlaceholderText('your@email.com').closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText('your@email.com'), '@');
      await waitFor(() => {
        expect(screen.queryByText('Please enter a valid email address.')).not.toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Successful submit
  // ---------------------------------------------------------------------------

  describe('Successful submission', () => {
    it('should call forgotPassword API with the provided email', async () => {
      const user = userEvent.setup();
      mockForgotPassword.mockResolvedValueOnce({ message: 'Email sent' });
      renderWithProviders(<ForgotPassword />);

      await user.type(screen.getByPlaceholderText('your@email.com'), 'user@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(mockForgotPassword).toHaveBeenCalledWith('user@example.com');
      });
    });

    it('should show success state after submission', async () => {
      const user = userEvent.setup();
      mockForgotPassword.mockResolvedValueOnce({ message: 'Email sent' });
      renderWithProviders(<ForgotPassword />);

      await user.type(screen.getByPlaceholderText('your@email.com'), 'user@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByText('Check your inbox')).toBeInTheDocument();
      });
    });

    it('should hide the form and show success message after submission', async () => {
      const user = userEvent.setup();
      mockForgotPassword.mockResolvedValueOnce({ message: 'Email sent' });
      renderWithProviders(<ForgotPassword />);

      await user.type(screen.getByPlaceholderText('your@email.com'), 'user@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /send reset link/i })).not.toBeInTheDocument();
        expect(screen.getByText('Check your inbox')).toBeInTheDocument();
      });
    });

    it('should show back-to-login link in success state', async () => {
      const user = userEvent.setup();
      mockForgotPassword.mockResolvedValueOnce({ message: 'Email sent' });
      renderWithProviders(<ForgotPassword />);

      await user.type(screen.getByPlaceholderText('your@email.com'), 'user@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        const backLinks = screen.getAllByRole('link', { name: /back to login/i });
        expect(backLinks.length).toBeGreaterThan(0);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // API error
  // ---------------------------------------------------------------------------

  describe('API error handling', () => {
    it('should show error message when API call fails', async () => {
      const user = userEvent.setup();
      mockForgotPassword.mockRejectedValueOnce(new Error('Network error'));
      renderWithProviders(<ForgotPassword />);

      await user.type(screen.getByPlaceholderText('your@email.com'), 'user@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByText('Reset failed. Please try again.')).toBeInTheDocument();
      });
    });

    it('should keep the form visible after error', async () => {
      const user = userEvent.setup();
      mockForgotPassword.mockRejectedValueOnce(new Error('Network error'));
      renderWithProviders(<ForgotPassword />);

      await user.type(screen.getByPlaceholderText('your@email.com'), 'user@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByText('Reset failed. Please try again.')).toBeInTheDocument();
      });

      // Form is still visible
      expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
    });
  });
});

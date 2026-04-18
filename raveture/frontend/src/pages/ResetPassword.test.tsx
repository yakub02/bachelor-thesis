/**
 * ResetPassword Component Tests
 *
 * Tests the full password reset flow including:
 * - Loading state while token is verified
 * - Invalid / missing token → error state
 * - Valid token → shows password form
 * - Password validation rules
 * - Successful reset → redirect to /login?reset=success
 * - API error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, userEvent } from '@/test/utils/test-utils';
import { ResetPassword } from './ResetPassword';

vi.mock('gsap', () => ({
  default: { timeline: () => ({ fromTo: vi.fn().mockReturnThis() }) },
}));

vi.mock('@gsap/react', () => ({ useGSAP: vi.fn() }));

// Replace AuthProvider with pass-through (avoids async init blocking children render)
vi.mock('@/context/AuthContext', async () => {
  const actual = await vi.importActual('@/context/AuthContext');
  return { ...actual, AuthProvider: ({ children }: any) => children };
});

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// Hoist mock functions so they are available inside vi.mock factory
const { mockVerifyResetToken, mockResetPassword } = vi.hoisted(() => ({
  mockVerifyResetToken: vi.fn(),
  mockResetPassword: vi.fn(),
}));

vi.mock('@/services', () => ({
  ravetureApi: {
    verifyResetToken: mockVerifyResetToken,
    resetPassword: mockResetPassword,
  },
  ticketingApi: { setAuth: vi.fn() },
}));

// Helpers
function renderWithToken(token: string) {
  return renderWithProviders(<ResetPassword />, {
    initialRoute: `/reset-password?token=${token}`,
  });
}

function renderWithoutToken() {
  return renderWithProviders(<ResetPassword />, {
    initialRoute: '/reset-password',
  });
}

describe('ResetPassword Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Token verification states
  // ---------------------------------------------------------------------------

  describe('Token verification', () => {
    it('should show loading state while verifying token', () => {
      // verifyResetToken never resolves during this test
      mockVerifyResetToken.mockReturnValue(new Promise(() => {}));

      renderWithToken('pending-token');

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should show error state when no token is provided', async () => {
      renderWithoutToken();

      await waitFor(() => {
        expect(screen.getByText('Invalid or expired reset link.')).toBeInTheDocument();
      });
    });

    it('should show error state when token is invalid', async () => {
      mockVerifyResetToken.mockResolvedValueOnce({ valid: false });

      renderWithToken('bad-token');

      await waitFor(() => {
        expect(screen.getByText('Invalid or expired reset link.')).toBeInTheDocument();
      });
    });

    it('should show error state when token verification fails (network error)', async () => {
      mockVerifyResetToken.mockRejectedValueOnce(new Error('Network error'));

      renderWithToken('some-token');

      await waitFor(() => {
        expect(screen.getByText('Invalid or expired reset link.')).toBeInTheDocument();
      });
    });

    it('should show link to forgot-password page in error state', async () => {
      mockVerifyResetToken.mockResolvedValueOnce({ valid: false });

      renderWithToken('bad-token');

      await waitFor(() => {
        const link = screen.getByRole('link', { name: /send reset link/i });
        expect(link).toHaveAttribute('href', '/forgot-password');
      });
    });

    it('should show the password form when token is valid', async () => {
      mockVerifyResetToken.mockResolvedValueOnce({ valid: true });

      renderWithToken('valid-token');

      await waitFor(() => {
        expect(screen.getByText('Set new password')).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Form rendering (valid token)
  // ---------------------------------------------------------------------------

  describe('Form rendering (valid token)', () => {
    beforeEach(() => {
      mockVerifyResetToken.mockResolvedValueOnce({ valid: true });
    });

    it('should render new password input', async () => {
      renderWithToken('valid-token');

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Min. 8 chars, uppercase, lowercase, number')
        ).toBeInTheDocument();
      });
    });

    it('should render confirm password input', async () => {
      renderWithToken('valid-token');

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Repeat your password')).toBeInTheDocument();
      });
    });

    it('should render submit button', async () => {
      renderWithToken('valid-token');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
      });
    });

    it('should disable submit button when fields are empty', async () => {
      renderWithToken('valid-token');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reset password/i })).toBeDisabled();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Password validation (valid token)
  // ---------------------------------------------------------------------------

  describe('Password validation', () => {
    async function setupValidTokenAndForm() {
      mockVerifyResetToken.mockResolvedValueOnce({ valid: true });
      renderWithToken('valid-token');
      await waitFor(() => {
        expect(screen.getByText('Set new password')).toBeInTheDocument();
      });
    }

    async function fillAndSubmit(
      user: ReturnType<typeof userEvent.setup>,
      password: string,
      confirm: string
    ) {
      await user.type(
        screen.getByPlaceholderText('Min. 8 chars, uppercase, lowercase, number'),
        password
      );
      await user.type(screen.getByPlaceholderText('Repeat your password'), confirm);
      await user.click(screen.getByRole('button', { name: /reset password/i }));
    }

    it('should reject password shorter than 8 characters', async () => {
      const user = userEvent.setup();
      await setupValidTokenAndForm();

      await fillAndSubmit(user, 'Short1', 'Short1');

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
      });
      expect(mockResetPassword).not.toHaveBeenCalled();
    });

    it('should reject password without uppercase letter', async () => {
      const user = userEvent.setup();
      await setupValidTokenAndForm();

      await fillAndSubmit(user, 'nouppercase1', 'nouppercase1');

      await waitFor(() => {
        expect(
          screen.getByText('Password must contain at least one uppercase letter')
        ).toBeInTheDocument();
      });
    });

    it('should reject password without lowercase letter', async () => {
      const user = userEvent.setup();
      await setupValidTokenAndForm();

      await fillAndSubmit(user, 'NOLOWERCASE1', 'NOLOWERCASE1');

      await waitFor(() => {
        expect(
          screen.getByText('Password must contain at least one lowercase letter')
        ).toBeInTheDocument();
      });
    });

    it('should reject password without number', async () => {
      const user = userEvent.setup();
      await setupValidTokenAndForm();

      await fillAndSubmit(user, 'NoNumberHere', 'NoNumberHere');

      await waitFor(() => {
        expect(
          screen.getByText('Password must contain at least one number')
        ).toBeInTheDocument();
      });
    });

    it('should reject mismatched passwords', async () => {
      const user = userEvent.setup();
      await setupValidTokenAndForm();

      await fillAndSubmit(user, 'SecurePass1', 'DifferentPass1');

      await waitFor(() => {
        expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
      });
    });

    it('should clear error when user edits the password field', async () => {
      const user = userEvent.setup();
      await setupValidTokenAndForm();

      await fillAndSubmit(user, 'short', 'short');
      await waitFor(() => {
        expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
      });

      await user.type(
        screen.getByPlaceholderText('Min. 8 chars, uppercase, lowercase, number'),
        'X'
      );
      await waitFor(() => {
        expect(
          screen.queryByText('Password must be at least 8 characters')
        ).not.toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Successful reset
  // ---------------------------------------------------------------------------

  describe('Successful reset', () => {
    it('should call resetPassword with correct token and password', async () => {
      mockVerifyResetToken.mockResolvedValueOnce({ valid: true });
      mockResetPassword.mockResolvedValueOnce({ message: 'Password reset' });

      const user = userEvent.setup();
      renderWithToken('my-valid-token');

      await waitFor(() => {
        expect(screen.getByText('Set new password')).toBeInTheDocument();
      });

      await user.type(
        screen.getByPlaceholderText('Min. 8 chars, uppercase, lowercase, number'),
        'SecurePass1'
      );
      await user.type(screen.getByPlaceholderText('Repeat your password'), 'SecurePass1');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith('my-valid-token', 'SecurePass1');
      });
    });

    it('should navigate to /login?reset=success after successful reset', async () => {
      mockVerifyResetToken.mockResolvedValueOnce({ valid: true });
      mockResetPassword.mockResolvedValueOnce({ message: 'Password reset' });

      const user = userEvent.setup();
      renderWithToken('my-valid-token');

      await waitFor(() => {
        expect(screen.getByText('Set new password')).toBeInTheDocument();
      });

      await user.type(
        screen.getByPlaceholderText('Min. 8 chars, uppercase, lowercase, number'),
        'SecurePass1'
      );
      await user.type(screen.getByPlaceholderText('Repeat your password'), 'SecurePass1');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login?reset=success');
      });
    });
  });

  // ---------------------------------------------------------------------------
  // API error during reset
  // ---------------------------------------------------------------------------

  describe('Reset API error', () => {
    it('should show error message when resetPassword call fails', async () => {
      mockVerifyResetToken.mockResolvedValueOnce({ valid: true });
      mockResetPassword.mockRejectedValueOnce(new Error('Token expired'));

      const user = userEvent.setup();
      renderWithToken('expired-token');

      await waitFor(() => {
        expect(screen.getByText('Set new password')).toBeInTheDocument();
      });

      await user.type(
        screen.getByPlaceholderText('Min. 8 chars, uppercase, lowercase, number'),
        'SecurePass1'
      );
      await user.type(screen.getByPlaceholderText('Repeat your password'), 'SecurePass1');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(screen.getByText('Reset failed. Please try again.')).toBeInTheDocument();
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});

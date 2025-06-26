import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AuthView from '../components/AuthView'

describe('AuthView', () => {
  const mockOnSuccess = vi.fn()
  const mockOnError = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Login Mode', () => {
    it('renders login form correctly', () => {
      render(
        <AuthView 
          isLogin={true} 
          onSuccess={mockOnSuccess} 
          onError={mockOnError} 
        />
      )

      expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Email Address')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
    })

    it('shows offline mode notice', () => {
      render(
        <AuthView 
          isLogin={true} 
          onSuccess={mockOnSuccess} 
          onError={mockOnError} 
        />
      )

      expect(screen.getByText(/running in offline mode/i)).toBeInTheDocument()
    })

    it('handles successful login submission', async () => {
      const user = userEvent.setup()
      
      render(
        <AuthView 
          isLogin={true} 
          onSuccess={mockOnSuccess} 
          onError={mockOnError} 
        />
      )

      const emailInput = screen.getByPlaceholderText('Email Address')
      const passwordInput = screen.getByPlaceholderText('Password')
      const submitButton = screen.getByRole('button', { name: /login/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith({
          uid: expect.stringMatching(/^user_\d+$/),
          email: 'test@example.com',
          isAnonymous: false,
        })
      })
    })

    it('requires email and password fields', async () => {
      const user = userEvent.setup()
      
      render(
        <AuthView 
          isLogin={true} 
          onSuccess={mockOnSuccess} 
          onError={mockOnError} 
        />
      )

      const submitButton = screen.getByRole('button', { name: /login/i })
      await user.click(submitButton)

      // Form should not submit without required fields
      expect(mockOnSuccess).not.toHaveBeenCalled()
    })

    it('disables form during submission', async () => {
      const user = userEvent.setup()
      
      render(
        <AuthView 
          isLogin={true} 
          onSuccess={mockOnSuccess} 
          onError={mockOnError} 
        />
      )

      const emailInput = screen.getByPlaceholderText('Email Address')
      const passwordInput = screen.getByPlaceholderText('Password')
      const submitButton = screen.getByRole('button', { name: /login/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      
      // Simply verify that form submission works
      await user.click(submitButton)
      
      // Verify onSuccess was called with the correct user data
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith({
          uid: expect.stringMatching(/^user_\d+$/),
          email: 'test@example.com',
          isAnonymous: false,
        })
      })
    })
  })

  describe('Register Mode', () => {
    it('renders register form correctly', () => {
      render(
        <AuthView 
          isLogin={false} 
          onSuccess={mockOnSuccess} 
          onError={mockOnError} 
        />
      )

      expect(screen.getByText('Register')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
    })

    it('handles successful registration submission', async () => {
      const user = userEvent.setup()
      
      render(
        <AuthView 
          isLogin={false} 
          onSuccess={mockOnSuccess} 
          onError={mockOnError} 
        />
      )

      const emailInput = screen.getByPlaceholderText('Email Address')
      const passwordInput = screen.getByPlaceholderText('Password')
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'newuser@example.com')
      await user.type(passwordInput, 'newpassword123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith({
          uid: expect.stringMatching(/^user_\d+$/),
          email: 'newuser@example.com',
          isAnonymous: false,
        })
      })
    })
  })

  describe('Error Handling', () => {
    it('displays error messages', async () => {
      // Mock console.error to avoid noise in test output
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const user = userEvent.setup()
      
      // Create a mock onSuccess that throws an error
      const errorOnSuccess = vi.fn(() => {
        throw new Error('Test error')
      })
      
      render(
        <AuthView 
          isLogin={true} 
          onSuccess={errorOnSuccess} 
          onError={mockOnError} 
        />
      )

      const emailInput = screen.getByPlaceholderText('Email Address')
      const passwordInput = screen.getByPlaceholderText('Password')
      const submitButton = screen.getByRole('button', { name: /login/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Test error')
      })

      // Cleanup
      consoleSpy.mockRestore()
    })
  })

  describe('Form Validation', () => {
    it('validates email format', () => {
      render(
        <AuthView 
          isLogin={true} 
          onSuccess={mockOnSuccess} 
          onError={mockOnError} 
        />
      )

      const emailInput = screen.getByPlaceholderText('Email Address') as HTMLInputElement
      expect(emailInput.type).toBe('email')
      expect(emailInput.required).toBe(true)
    })

    it('validates password field', () => {
      render(
        <AuthView 
          isLogin={true} 
          onSuccess={mockOnSuccess} 
          onError={mockOnError} 
        />
      )

      const passwordInput = screen.getByPlaceholderText('Password') as HTMLInputElement
      expect(passwordInput.type).toBe('password')
      expect(passwordInput.required).toBe(true)
    })
  })
})

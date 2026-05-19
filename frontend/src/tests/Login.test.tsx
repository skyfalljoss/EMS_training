import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, test, vi } from 'vitest'
import Login from '../pages/Login'
import { AuthProvider } from '../context/AuthContext'
import { ApiError } from '../types/api'

const mockLogin = vi.hoisted(() => vi.fn())

vi.mock('../api/auth', () => ({
  login: mockLogin,
  getMe: vi.fn().mockRejectedValue(new Error('noop')),
}))

const renderLogin = () =>
  render(
    <AuthProvider>
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    </AuthProvider>,
  )

test('renders login form and submits email + password', async () => {
  mockLogin.mockResolvedValue({ access_token: 'fake-token' })

  renderLogin()

  const emailInput = screen.getByPlaceholderText('Email')
  const passwordInput = screen.getByPlaceholderText('Password')
  const submitButton = screen.getByRole('button', { name: /sign in/i })

  fireEvent.change(emailInput, { target: { value: 'admin@ems.com' } })
  fireEvent.change(passwordInput, { target: { value: 'Admin@1234' } })
  fireEvent.click(submitButton)

  await waitFor(() => {
    expect(mockLogin).toHaveBeenCalledWith('admin@ems.com', 'Admin@1234')
  })
})

test('shows error message on failed login', async () => {
  mockLogin.mockRejectedValue(new ApiError('Invalid email or password.', 401))

  renderLogin()

  fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'bad@email.com' } })
  fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'wrong' } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

  await waitFor(() => {
    expect(screen.getByText('Invalid email or password.')).toBeInTheDocument()
  })
})

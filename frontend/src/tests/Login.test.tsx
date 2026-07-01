import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import Login from '../pages/Login'
import { AuthProvider } from '../context/AuthContext'
import { ApiError } from '../types/api'
import GuestRoute from '../components/GuestRoute'

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  getMe: vi.fn(),
}))

vi.mock('../api/auth', () => ({
  login: mocks.login,
  getMe: mocks.getMe,
}))

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  mocks.getMe.mockRejectedValue(new Error('noop'))
})

function makeToken(): string {
  const payload = btoa(JSON.stringify({
    sub: '1',
    email: 'admin@ems.com',
    employee_id: 1,
    exp: Math.floor(Date.now() / 1000) + 3600,
  }))
  return `header.${payload}.signature`
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(res => { resolve = res })
  return { promise, resolve }
}

function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}</div>
}

const renderLogin = () =>
  render(
    <AuthProvider>
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    </AuthProvider>,
  )

test('renders login form and submits email + password', async () => {
  mocks.login.mockResolvedValue({ access_token: makeToken() })

  renderLogin()

  const emailInput = screen.getByPlaceholderText('Email')
  const passwordInput = screen.getByPlaceholderText('Password')
  const submitButton = screen.getByRole('button', { name: /sign in/i })

  fireEvent.change(emailInput, { target: { value: 'admin@ems.com' } })
  fireEvent.change(passwordInput, { target: { value: 'Admin@1234' } })
  fireEvent.click(submitButton)

  await waitFor(() => {
    expect(mocks.login).toHaveBeenCalledWith('admin@ems.com', 'Admin@1234')
  })
})

test('shows error message on failed login', async () => {
  mocks.login.mockRejectedValue(new ApiError('Invalid email or password.', 401))

  renderLogin()

  fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'bad@email.com' } })
  fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'wrong' } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

  await waitFor(() => {
    expect(screen.getByText('Invalid email or password.')).toBeInTheDocument()
  })
})

test('waits for login to finish before navigating to dashboard', async () => {
  const me = deferred()
  mocks.login.mockResolvedValue({ access_token: makeToken() })
  mocks.getMe.mockReturnValue(me.promise)

  render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/login"]}>
        <LocationDisplay />
        <Routes>
          <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )

  fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'admin@ems.com' } })
  fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'Admin@1234' } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

  await waitFor(() => {
    expect(mocks.getMe).toHaveBeenCalled()
  })
  expect(screen.getByTestId('location')).toHaveTextContent('/login')

  me.resolve({
    id: 1,
    employee_id: 1,
    email: 'admin@ems.com',
    auth_role: 'admin',
    is_active: true,
    must_change_password: false,
  })

  await waitFor(() => {
    expect(screen.getByTestId('location')).toHaveTextContent('/dashboard')
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiError } from '../types/api'

interface RequestConfig {
  headers?: Record<string, string>
  url?: string
  params?: Record<string, unknown>
  [key: string]: unknown
}

const mockFns = vi.hoisted(() => {
  const requestHandlers: Array<(config: RequestConfig) => RequestConfig> = []

  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    isAxiosError: vi.fn(),
    requestUse: (handler: (config: RequestConfig) => RequestConfig) => {
      requestHandlers.push(handler)
    },
    getRequestHandler: () => requestHandlers[0],
  }
})

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: mockFns.get,
      post: mockFns.post,
      put: mockFns.put,
      delete: mockFns.delete,
      interceptors: {
        request: { use: mockFns.requestUse },
        response: { use: vi.fn() },
      },
    })),
    isAxiosError: mockFns.isAxiosError,
  },
}))

import { api } from '../api/request'

describe('api request wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('api.get', () => {
    it('calls instance.get and returns response data', async () => {
      mockFns.get.mockResolvedValue({ data: [{ id: 1, name: 'Alice' }] })

      const result = await api.get('/employees')

      expect(mockFns.get).toHaveBeenCalledWith('/employees', undefined)
      expect(result).toEqual([{ id: 1, name: 'Alice' }])
    })

    it('passes config to instance.get', async () => {
      mockFns.get.mockResolvedValue({ data: [] })
      const config = { params: { status: 'active' } }

      await api.get('/employees', config)

      expect(mockFns.get).toHaveBeenCalledWith('/employees', config)
    })
  })

  describe('api.post', () => {
    it('calls instance.post and returns response data', async () => {
      const payload = { name: 'Test', email: 'test@test.com' }
      mockFns.post.mockResolvedValue({ data: { id: 1, ...payload } })

      const result = await api.post('/employees', payload)

      expect(mockFns.post).toHaveBeenCalledWith('/employees', payload, undefined)
      expect(result).toEqual({ id: 1, name: 'Test', email: 'test@test.com' })
    })
  })

  describe('api.put', () => {
    it('calls instance.put and returns response data', async () => {
      const payload = { name: 'Updated' }
      mockFns.put.mockResolvedValue({ data: { id: 1, name: 'Updated' } })

      const result = await api.put('/employees/1', payload)

      expect(mockFns.put).toHaveBeenCalledWith('/employees/1', payload, undefined)
      expect(result).toEqual({ id: 1, name: 'Updated' })
    })
  })

  describe('api.delete', () => {
    it('calls instance.delete and returns response data', async () => {
      mockFns.delete.mockResolvedValue({ data: null })

      const result = await api.delete('/employees/1')

      expect(mockFns.delete).toHaveBeenCalledWith('/employees/1', undefined)
      expect(result).toBeNull()
    })
  })

  describe('request interceptor', () => {
    let handler: (config: RequestConfig) => RequestConfig

    beforeEach(() => {
      handler = mockFns.getRequestHandler()!
    })

    it('adds Bearer token for non-auth endpoints', () => {
      localStorage.setItem('access_token', 'test-token-123')

      const config: RequestConfig = { url: '/employees', headers: {} }
      const result = handler(config)

      expect(result.headers!.Authorization).toBe('Bearer test-token-123')
    })

    it('does not add Bearer token for /auth/login', () => {
      localStorage.setItem('access_token', 'test-token-123')

      const config: RequestConfig = { url: '/auth/login', headers: {} }
      const result = handler(config)

      expect(result.headers!.Authorization).toBeUndefined()
    })

    it('does not add Bearer token for /auth/register', () => {
      localStorage.setItem('access_token', 'test-token-123')

      const config: RequestConfig = { url: '/auth/register', headers: {} }
      const result = handler(config)

      expect(result.headers!.Authorization).toBeUndefined()
    })

    it('does not add header when no token in localStorage', () => {
      const config: RequestConfig = { url: '/employees', headers: {} }
      const result = handler(config)

      expect(result.headers!.Authorization).toBeUndefined()
    })

    it('preserves existing headers', () => {
      localStorage.setItem('access_token', 'token')

      const config: RequestConfig = { url: '/employees', headers: { 'X-Custom': 'value' } }
      const result = handler(config)

      expect(result.headers!['X-Custom']).toBe('value')
      expect(result.headers!.Authorization).toBe('Bearer token')
    })
  })

  describe('error handling', () => {
    it('throws ApiError on 401', async () => {
      const axiosError = { response: { status: 401, data: {} } }
      mockFns.isAxiosError.mockReturnValue(true)
      mockFns.get.mockRejectedValue(axiosError)

      await expect(api.get('/employees')).rejects.toThrow(ApiError)
    })

    it('does not clear a fresh token when an unauthenticated data request returns 401', async () => {
      localStorage.setItem('access_token', 'fresh-token')
      const axiosError = {
        response: { status: 401, data: { detail: 'Authentication required' } },
        config: { url: '/employees', headers: {} },
      }
      mockFns.isAxiosError.mockReturnValue(true)
      mockFns.get.mockRejectedValue(axiosError)

      await expect(api.get('/employees')).rejects.toThrow(ApiError)

      expect(localStorage.getItem('access_token')).toBe('fresh-token')
    })

    it('throws ApiError with detail message on 403', async () => {
      const axiosError = { response: { status: 403, data: { detail: 'You are not allowed' } } }
      mockFns.isAxiosError.mockReturnValue(true)
      mockFns.get.mockRejectedValue(axiosError)

      try {
        await api.get('/employees')
        expect.unreachable()
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError)
        expect((err as ApiError).message).toBe('You are not allowed')
      }
    })

    it('throws ApiError with "Access denied" fallback on 403 without detail', async () => {
      const axiosError = { response: { status: 403, data: {} } }
      mockFns.isAxiosError.mockReturnValue(true)
      mockFns.get.mockRejectedValue(axiosError)

      await expect(api.get('/employees')).rejects.toThrow('Access denied')
    })

    it('throws ApiError on 500 with server error detail', async () => {
      const axiosError = { response: { status: 500, data: { detail: 'Internal server error' } } }
      mockFns.isAxiosError.mockReturnValue(true)
      mockFns.get.mockRejectedValue(axiosError)

      await expect(api.get('/employees')).rejects.toThrow('Internal server error')
    })

    it('throws ApiError with generic message when no detail', async () => {
      const axiosError = { response: { status: 400, data: {} } }
      mockFns.isAxiosError.mockReturnValue(true)
      mockFns.get.mockRejectedValue(axiosError)

      await expect(api.get('/employees')).rejects.toThrow('Request failed (400)')
    })

    it('re-throws non-axios errors (network failure) raw', async () => {
      const networkError = new TypeError('Failed to fetch')
      mockFns.isAxiosError.mockReturnValue(false)
      mockFns.get.mockRejectedValue(networkError)

      await expect(api.get('/employees')).rejects.toThrow(TypeError)
      await expect(api.get('/employees')).rejects.toThrow('Failed to fetch')
    })

    it('re-throws axios error without response (network error) raw', async () => {
      const networkError = new Error('Network Error')
      mockFns.isAxiosError.mockReturnValue(true)
      mockFns.get.mockRejectedValue(networkError)

      await expect(api.get('/employees')).rejects.toThrow('Network Error')
    })
  })
})

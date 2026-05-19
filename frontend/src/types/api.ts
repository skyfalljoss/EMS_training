export class ApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof Error && typeof (err as ApiError).status === 'number'
}

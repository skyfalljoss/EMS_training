import type { ZodError } from 'zod'

export function firstError(err: unknown): string {
  const zod = err as ZodError
  if (zod?.issues?.[0]?.message) return zod.issues[0].message
  return 'Validation failed'
}

export { loginSchema, registerSchema, changePasswordSchema, authUserSchema } from './auth'
export { employeeSchema } from './employee'
export { departmentSchema } from './department'

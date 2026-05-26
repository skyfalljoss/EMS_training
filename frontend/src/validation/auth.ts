import { z } from 'zod'

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const changePasswordSchema = z
  .object({
    oldPwd: z.string().min(1, 'Current password is required'),
    newPwd: passwordSchema,
    confirmPwd: z.string(),
  })
  .refine(data => data.newPwd === data.confirmPwd, {
    message: 'Passwords do not match',
    path: ['confirmPwd'],
  })

export const authUserSchema = z.object({
  employee_id: z.string().min(1, 'Employee is required'),
  email: z.string().email('Invalid email address'),
  password: passwordSchema,
  auth_role: z.enum(['employee', 'manager', 'admin']),
})

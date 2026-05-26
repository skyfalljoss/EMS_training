import { z } from 'zod'

export const departmentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(10, 'Code must be at most 10 characters'),
  description: z.string().optional(),
  head: z.string().optional(),
  status: z.enum(['active', 'inactive', 'archived']),
})

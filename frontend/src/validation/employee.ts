import { z } from 'zod'

export const employeeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  role: z.string().min(1, 'Role is required'),
  department_id: z.string().min(1, 'Department is required'),
  position: z.string().optional(),
  status: z.enum(['active', 'inactive', 'on_leave', 'terminated']),
  phone: z.string().optional(),
  location: z.string().optional(),
  manager: z.string().optional(),
  salary: z.string().optional(),
  rating: z.string().optional(),
  start_date: z.string().optional(),
  date_of_birth: z.string().optional(),
  national_id: z.string().optional(),
})

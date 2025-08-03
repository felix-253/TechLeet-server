import { TYPE_EMPLOYEE_PERMISSION_REDIS } from '@/app/module/auth/types/employee-permission-redis.dto';

export interface IAuthInterceptor {
   isAdmin?: boolean;
   employeeId: number;
   permissions: TYPE_EMPLOYEE_PERMISSION_REDIS[];
}

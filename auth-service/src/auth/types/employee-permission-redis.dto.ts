import { TYPE_PERMISSION_ENUM } from '@/entities/master/enum/permission.enum';

export type TYPE_EMPLOYEE_PERMISSION_REDIS = {
   permissionType: TYPE_PERMISSION_ENUM;
   departmentId: number;
   headquarterId: number;
};

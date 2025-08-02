import { PermissionEntity } from '@/entities/master/permission.entity';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class EmployeeResponseDto {
   @Expose()
   employeeId?: number;

   @Expose()
   firstName: string;

   @Expose()
   lastName: string;

   @Expose()
   address: string;

   @Expose()
   birthDate: Date;

   @Expose()
   email: string;

   @Expose()
   gender: boolean;

   @Expose()
   startDate?: Date;

   @Expose()
   isActive?: boolean;

   @Expose()
   avatarUrl?: string;

   @Expose()
   phoneNumber: string;

   @Expose()
   baseSalary: number;

   @Expose()
   departmentId: number;

   @Expose()
   positionId: number;

   @Expose()
   positionTypeId: number;

   @Expose()
   permissions?: PermissionEntity[];

   @Expose()
   createdAt?: Date;
}

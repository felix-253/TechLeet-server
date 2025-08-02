import { RedisService } from '@/app/configs/redis';
import { TYPE_PERMISSION_ENUM } from '@/entities/master/enum/permission.enum';
import { PermissionRepository } from '@/repositories/permission.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PermissionService {
   constructor(
      private readonly permissionRepository: PermissionRepository,
      private readonly redisService: RedisService,
   ) {}
   async checkPermission(
      type: TYPE_PERMISSION_ENUM,
      departmentId: number,
      headquarterId: number,
   ): Promise<boolean> {
      // const permission = await this.redisService.
      return false;
   }
}

import { PermissionEntity } from '../entities/master/permission.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

@Injectable()
export class PermissionRepository {
   constructor(
      @InjectRepository(PermissionEntity)
      private permissionRepository: Repository<PermissionEntity>,
   ) {}

   findPermissionsByListId(permisstionIds: number[] | undefined): Promise<PermissionEntity[]> {
      if (!permisstionIds || permisstionIds.length === 0) {
         return Promise.resolve([]);
      }
      const permissions = this.permissionRepository.find({
         where: {
            permissionId: In(permisstionIds),
         },
      });
      return permissions;
   }
}

import { PermissionEntity } from '@/entities/master/permission.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

@Injectable()
export class PermissionRepository {
   constructor(
      @InjectRepository(PermissionEntity)
      private permissionRepository: Repository<PermissionEntity>,
   ) {}

   findPermissionsByListId(permisstionIds: number[]): Promise<PermissionEntity[]> {
      const permissions = this.permissionRepository.find({
         where: {
            permissionId: In(permisstionIds),
         },
      });
      return permissions;
   }

   async generateMissingPermissionNames(): Promise<number> {
      const permissionsWithoutName = await this.permissionRepository.find({
         where: { permissionName: null },
      });

      let updated = 0;
      for (const permission of permissionsWithoutName) {
         const parts: string[] = [];

         if (permission.category) {
            parts.push(permission.category.toUpperCase());
         }

         if (permission.resource) {
            parts.push(permission.resource.toUpperCase());
         }

         if (permission.action) {
            parts.push(permission.action.toUpperCase());
         }

         if (permission.permissionType) {
            parts.push(permission.permissionType);
         }

         // Generate permission name
         let permissionName: string;
         if (parts.length === 0) {
            const timestamp = Date.now().toString().slice(-6);
            permissionName = `PERMISSION_${permission.permissionId}_${timestamp}`;
         } else {
            permissionName = parts.join('_');
         }

         // Ensure uniqueness
         let isUnique = false;
         let attempts = 0;
         let finalName = permissionName;

         while (!isUnique && attempts < 100) {
            const existing = await this.permissionRepository.findOne({
               where: { permissionName: finalName },
            });

            if (!existing) {
               isUnique = true;
               permission.permissionName = finalName;
               await this.permissionRepository.save(permission);
               updated++;
            } else {
               attempts++;
               finalName = `${permissionName}_${attempts}`;
            }
         }
      }

      return updated;
   }
}

import { Global, Module } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionEntity } from '@/entities/master/permission.entity';
import { PermissionRepository } from '@/repositories/permission.repository';
import { RedisService } from '@/app/configs/redis';

@Global()
@Module({
   imports: [TypeOrmModule.forFeature([PermissionEntity])],
   providers: [PermissionService, PermissionRepository, RedisService],
   exports: [PermissionService],
})
export class PermissionModule {}

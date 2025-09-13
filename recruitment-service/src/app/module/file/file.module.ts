import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileController } from './file.controller';
import { BrevoWebhookController } from './brevo-webhook.controller';
import { FileService } from './file.service';
import { FileEntity } from '../../../entities/recruitment/file.entity';

@Module({
   imports: [TypeOrmModule.forFeature([FileEntity])],
   controllers: [FileController, BrevoWebhookController],
   providers: [FileService],
   exports: [FileService],
})
export class FileModule {}

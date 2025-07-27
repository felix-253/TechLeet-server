import { IsString } from 'class-validator';

export class CreatePassword {
   @IsString()
   url?: string;

   @IsString()
   newPassword: string;
}

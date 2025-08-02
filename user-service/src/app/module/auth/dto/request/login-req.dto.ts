import { IsEmail, IsString } from 'class-validator';
export class LoginReqDto {
   @IsString()
   @IsEmail()
   email: string;

   @IsString()
   password: string;
}

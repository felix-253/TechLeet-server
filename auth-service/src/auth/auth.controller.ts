import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { LocalAuthGuard } from '@/auth-service/src/guard/local-auth.guard';
import { JwtAuthGuard } from '@/auth-service/src/guard/jwt-auth.guard';
import { CreateEmployeeDto } from './dto/request/register-req.dto';
import { CreatePassword } from './dto/request/create-password-req.dto';

@Controller('auth')
@ApiTags('Authentication')
export class AuthController {
   constructor(private authService: AuthService) {}

   @UseGuards(LocalAuthGuard)
   @Post('login')
   @ApiBody({
      description: 'Login with username and password',
      examples: {
         login: {
            value: {
               email: 'admin@example.com',
               password: 'securePassword123',
            },
         },
      },
   })
   async login(@Request() req): Promise<{ token: string }> {
      return this.authService.login(req.user);
   }

   @UseGuards(JwtAuthGuard)
   @Post('createEmployee')
   @ApiBearerAuth('token')
   @ApiBody({
      description: 'Create new employee by role admin',
      examples: {
         register: {
            value: {
               firstName: 'Trần',
               lastName: 'Viễn',
               address: '07 Xô Viết Nghệ Tĩnh, Huyện Hòa Vang, TP. Đà Nẵng',
               birthDate: '1995-11-20T00:00:00.000Z',
               email: 'tran.vien@example.com',
               gender: true,
               startDate: '2023-07-01T00:00:00.000Z',
               confirmationDate: '2023-09-01T00:00:00.000Z',
               isActive: true,
               avatarUrl: 'https://example.com/avatar.jpg',
               phoneNumber: '0930139700',
               departmentId: 1,
               positionId: 1,
               baseSalary: 12000000,
               positionTypeId: 1,
               permissions: [1, 2],
            },
         },
      },
   })
   async createEmployee(@Body() dto: CreateEmployeeDto) {
      return await this.authService.createEmployee(dto);
   }

   @Post('/create-password')
   @ApiBody({
      description: 'Create password with new employee',
      examples: {
         CreatePassword: {
            value: {
               url: 'http://techleet.com/update-password/MjA6aHR0cDovL2xvY2FsaG9zdDo0MDAwL3VwZGF0ZXBhc3N3b3Jk',
               newPassword: 'securePassword123',
            },
         },
      },
   })
   async createPassword(@Body() dto: CreatePassword) {
      return await this.authService.createPassword(dto);
   }
}

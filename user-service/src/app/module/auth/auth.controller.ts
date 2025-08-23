import { LocalAuthGuard } from '@/common/guard/local-auth.guard';
import { JwtAuthGuard } from '@/common/guard/jwt-auth.guard';
import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBody, ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
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
               email: 'admin@techleet.com',
               password: '123456',
            },
         },
      },
   })
   async login(@Request() req): Promise<{ token: string }> {
      return this.authService.login(req.user);
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

   @Post('/validate-token')
   @UseGuards(JwtAuthGuard)
   @ApiBearerAuth('token')
   @ApiOperation({
      summary: 'Validate JWT token',
      description: 'Validates JWT token and returns user information for API Gateway',
   })
   @ApiResponse({
      status: 200,
      description: 'Token is valid, returns user information',
   })
   @ApiResponse({
      status: 401,
      description: 'Token is invalid or expired',
   })
   async validateToken(@Request() req): Promise<any> {
      const token = req.headers.authorization?.replace('Bearer ', '');
      return await this.authService.validateTokenForGateway(token);
   }
}

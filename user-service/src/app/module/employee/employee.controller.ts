import { JwtAuthGuard } from '@/common/guard/jwt-auth.guard';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('employee')
export class EmployeeController {
   @UseGuards(JwtAuthGuard)
   @ApiBearerAuth('token')
   @Get('profile')
   getProfile(): { message: string } {
      return { message: 'User profile' };
   }
}

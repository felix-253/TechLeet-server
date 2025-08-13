import { JwtAuthGuard } from '@/common/guard/jwt-auth.guard';
import {
   Body,
   Controller,
   Get,
   Post,
   Put,
   Query,
   UseGuards,
   UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { CreateEmployeeDto } from './dto/request/create-entity-req.dto';
import { GetEmployeeReqDto } from './dto/request/get-employee-req.dto';
import { UpdateEmployeeDto } from './dto/request/update-employee-req.dto';
import { EmployeeResponseDto } from './dto/response/employee-res.dto';
import { EmployeeService } from './employee.service';
import { AuthInterceptor } from '@/common/interceptor/auth.interceptor';
import { User } from '@/common/decorater/user.decorator';
import { IAuthInterceptor } from '@/common/types';

@Controller('employee')
export class EmployeeController {
   constructor(private readonly EmployeeService: EmployeeService) {}

   @UseGuards(JwtAuthGuard)
   @UseInterceptors(AuthInterceptor)
   @Get('my-profile')
   @ApiBearerAuth('token')
   async getProfile(@User() user: IAuthInterceptor): Promise<EmployeeResponseDto> {
      const result = await this.EmployeeService.myProfile(user);
      return plainToInstance(EmployeeResponseDto, result);
   }

   @UseGuards(JwtAuthGuard)
   @Get('')
   @ApiBearerAuth('token')
   async GetEmployeeByFilter(
      @Query() dto: GetEmployeeReqDto,
   ): Promise<{ total: number; data: EmployeeResponseDto[] }> {
      const { data, total } = await this.EmployeeService.getEmployeeByFilter(dto);
      const entities = plainToInstance(EmployeeResponseDto, data, {
         excludeExtraneousValues: true,
      });
      return { data: entities, total };
   }

   @UseGuards(JwtAuthGuard)
   @Post('')
   @ApiBearerAuth('token')
   @ApiBody({
      description: 'Create new employee by role admin',
      type: CreateEmployeeDto,
   })
   async createEmployee(@Body() dto: CreateEmployeeDto): Promise<EmployeeResponseDto> {
      const result = plainToInstance(
         EmployeeResponseDto,
         await this.EmployeeService.createEmployee(dto),
      );

      return result;
   }

   @UseGuards(JwtAuthGuard)
   @Put('')
   @ApiBearerAuth('token')
   @ApiBody({
      description: 'Update new employee by role admin',
      type: UpdateEmployeeDto,
   })
   async updateEmployee(@Body() dto: UpdateEmployeeDto): Promise<EmployeeResponseDto> {
      const result = plainToInstance(
         EmployeeResponseDto,
         await this.EmployeeService.updateEmployee(dto),
      );

      return result;
   }

   @UseGuards(JwtAuthGuard)
   @Post('generate-employee-codes')
   @ApiBearerAuth('token')
   @ApiOperation({ summary: 'Generate employee codes for existing employees without codes' })
   async generateMissingEmployeeCodes(): Promise<{ updated: number }> {
      return await this.EmployeeService.generateMissingEmployeeCodes();
   }

   @UseGuards(JwtAuthGuard)
   @Post('generate-permission-names')
   @ApiBearerAuth('token')
   @ApiOperation({ summary: 'Generate permission names for existing permissions without names' })
   async generateMissingPermissionNames(): Promise<{ updated: number }> {
      return await this.EmployeeService.generateMissingPermissionNames();
   }
}

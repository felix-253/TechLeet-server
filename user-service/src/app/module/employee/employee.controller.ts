import { JwtAuthGuard } from '@/common/guard/jwt-auth.guard';
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiQuery } from '@nestjs/swagger';
import { CreateEmployeeDto } from './dto/request/create-entity-req.dto';
import { EmployeeService } from './employee.service';
import { GetEmployeeReqDto } from './dto/request/get-employee-req.dto';
import { EmployeeResponseDto } from './dto/response/employee-res.dto';
import { plainToInstance } from 'class-transformer';

@Controller('employee')
export class EmployeeController {
   constructor(private readonly EmployeeService: EmployeeService) {}

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
         {
            excludeExtraneousValues: true,
         },
      );

      return result;
   }

   // @UseGuards(JwtAuthGuard)
   // @Post('')
   // @ApiBearerAuth('token')
   // @ApiBody({
   //    description: 'Create new employee by role admin',
   //    type: CreateEmployeeDto,
   // })
   // async updateEmployee(@Body() dto: CreateEmployeeDto): Promise<EmployeeResponseDto> {
   //    const result = await this.EmployeeService.createEmployee(dto);
   //    return result;
   // }
}

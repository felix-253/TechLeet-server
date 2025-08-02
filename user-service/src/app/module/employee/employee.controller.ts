import { JwtAuthGuard } from '@/common/guard/jwt-auth.guard';
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiQuery } from '@nestjs/swagger';
import { CreateEmployeeDto } from './dto/request/create-entity-req.dto';
import { EmployeeService } from './employee.service';
import { GetEmployeeReqDto } from './dto/request/get-employee-req.dto';

@Controller('employee')
export class EmployeeController {
   constructor(private readonly EmployeeService: EmployeeService) {}
   @UseGuards(JwtAuthGuard)
   @Post('')
   @ApiBearerAuth('token')
   @ApiBody({
      description: 'Create new employee by role admin',
      type: CreateEmployeeDto,
   })
   async createEmployee(@Body() dto: CreateEmployeeDto) {
      return await this.EmployeeService.createEmployee(dto);
   }

   @UseGuards(JwtAuthGuard)
   @Get('')
   @ApiBearerAuth('token')
   @ApiQuery({
      description: 'Filter employee by role admin',
      type: GetEmployeeReqDto,
   })
   async GetEmployeeByFilter(@Query() dto: GetEmployeeReqDto) {
      return await this.EmployeeService.getEmployeeByFilter(dto);
   }
}

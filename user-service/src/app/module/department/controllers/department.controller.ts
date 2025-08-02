import { Controller, Get } from '@nestjs/common';

@Controller('department')
export class DepartmentController {
   constructor() {}
   @Get()
   getDepartment() {
      return { message: 'Department endpoint reached' };
   }
}

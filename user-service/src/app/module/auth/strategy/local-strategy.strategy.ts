import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, NotFoundException } from '@nestjs/common';
import { EmployeeEntity } from '@/entities/master/employee.entity';
import { EmployeeRepository } from '@/repositories/employee.repository';
import bcrypt from 'bcryptjs';
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
   constructor(private employeeRepository: EmployeeRepository) {
      super({
         usernameField: 'email',
      });
   }

   async validate(email: string, password: string): Promise<EmployeeEntity> {
      const employee = await this.employeeRepository.employeeLogin(email);
      if (!employee) {
         throw new NotFoundException('Không tìm thấy thông tin đăng nhập');
      }
      const isPasswordValid = bcrypt.compare(employee.password, password);
      if (!isPasswordValid) throw new NotFoundException('Wrong email or password');
      return employee;
   }
}

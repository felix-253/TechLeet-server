import {
   Column,
   Entity,
   JoinTable,
   ManyToMany,
   PrimaryGeneratedColumn,
   Index,
   BeforeInsert,
   BeforeUpdate,
} from 'typeorm';
import { BaseEntity } from '../base/base.entities';
import { PermissionEntity } from './permission.entity';
import { IsEmail, IsPhoneNumber, Length, IsOptional, Min } from 'class-validator';
import * as bcrypt from 'bcryptjs';

@Entity('employee')
@Index(['email'], { unique: true })
@Index(['employeeCode'], { unique: true })
export class EmployeeEntity extends BaseEntity {
   @PrimaryGeneratedColumn('identity', {
      comment: 'Unique identifier for the employee',
   })
   employeeId: number;

   @Column({
      type: 'varchar',
      length: 20,
      nullable: true,
      unique: true,
      comment: 'Unique employee code for identification',
   })
   employeeCode?: string;

   @Column({
      type: 'varchar',
      nullable: false,
      comment: 'Employee first name',
   })
   @Length(2, 50, { message: 'First name must be between 2 and 50 characters' })
   firstName: string;

   @Column({
      type: 'varchar',
      nullable: false,
      comment: 'Employee last name',
   })
   @Length(2, 50, { message: 'Last name must be between 2 and 50 characters' })
   lastName: string;

   @Column({
      type: 'text',
      nullable: true,
      comment: 'Employee residential address',
   })
   address?: string;

   @Column({
      type: 'date',
      nullable: true,
      comment: 'Employee date of birth',
   })
   birthDate?: Date;

   @Column({
      type: 'varchar',
      nullable: false,
      unique: true,
      comment: 'Employee email address',
   })
   @IsEmail({}, { message: 'Please provide a valid email address' })
   email: string;

   @Column({
      type: 'varchar',
      length: 255,
      nullable: true,
      select: false,
      comment: 'Encrypted password for authentication',
   })
   password?: string;

   @Column({
      type: 'boolean',
      nullable: true,
      comment: 'Employee gender (true=male, false=female)',
   })
   gender?: boolean;

   @Column({
      type: 'date',
      nullable: true,
      comment: 'Employee start date',
   })
   startDate?: Date;

   @Column({
      type: 'date',
      nullable: true,
      comment: 'Date when employee was confirmed',
   })
   confirmationDate?: Date;

   @Column({
      type: 'varchar',
      length: 255,
      nullable: true,
      comment: 'URL to employee avatar image',
   })
   avatarUrl?: string;

   @Column({
      type: 'varchar',
      length: 20,
      nullable: true,
      comment: 'Employee phone number',
   })
   @IsOptional()
   @IsPhoneNumber(null, { message: 'Please provide a valid phone number' })
   phoneNumber?: string;

   @Column({
      type: 'decimal',
      precision: 10,
      scale: 2,
      nullable: true,
      comment: 'Employee base salary',
   })
   @IsOptional()
   @Min(0, { message: 'Salary must be a positive number' })
   baseSalary?: number;
   // Foreign Keys (references to Company Service entities)
   @Column({
      type: 'int',
      nullable: true,
      comment: 'Reference to department (Company Service)',
   })
   departmentId?: number;

   @Column({
      type: 'int',
      nullable: true,
      comment: 'Reference to position (Company Service)',
   })
   positionId?: number;

   @Column({
      type: 'int',
      nullable: true,
      comment: 'Reference to manager employee',
   })
   managerId?: number;

   @Column({
      type: 'varchar',
      length: 20,
      nullable: true,
      comment: 'Employee status (active, inactive, terminated, etc.)',
   })
   status?: string;

   @Column({
      type: 'date',
      nullable: true,
      comment: 'Date when employee was terminated',
   })
   terminationDate?: Date;

   @Column({
      type: 'text',
      nullable: true,
      comment: 'Reason for termination',
   })
   terminationReason?: string;

   // Relationships
   @ManyToMany(() => PermissionEntity, (permission) => permission.employees, {
      cascade: ['insert', 'update'],
   })
   @JoinTable({
      name: 'employee_permissions',
      joinColumn: {
         name: 'employeeId',
         referencedColumnName: 'employeeId',
      },
      inverseJoinColumn: {
         name: 'permissionId',
         referencedColumnName: 'permissionId',
      },
   })
   permissions?: PermissionEntity[];

   // Computed properties
   get fullName(): string {
      return `${this.firstName} ${this.lastName}`;
   }

   get age(): number | null {
      if (!this.birthDate) return null;
      const today = new Date();
      const birthDate = new Date(this.birthDate);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
         age--;
      }
      return age;
   }

   // Hooks for password hashing and employee code generation
   @BeforeInsert()
   async beforeInsert() {
      // Generate employee code if not provided
      if (!this.employeeCode) {
         this.employeeCode = await this.generateEmployeeCode();
      }

      // Hash password if provided
      if (this.password) {
         const saltRounds = 12;
         this.password = await bcrypt.hash(this.password, saltRounds);
      }
   }

   @BeforeUpdate()
   async hashPassword() {
      if (this.password) {
         const saltRounds = 12;
         this.password = await bcrypt.hash(this.password, saltRounds);
      }
   }

   // Generate unique employee code
   private async generateEmployeeCode(): Promise<string> {
      const year = new Date().getFullYear().toString().slice(-2);
      const randomNum = Math.floor(Math.random() * 10000)
         .toString()
         .padStart(4, '0');
      return `EMP${year}${randomNum}`;
   }

   // Method to verify password
   async verifyPassword(plainPassword: string): Promise<boolean> {
      if (!this.password) return false;
      return bcrypt.compare(plainPassword, this.password);
   }
}

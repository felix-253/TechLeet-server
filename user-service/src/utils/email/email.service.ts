import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as brevo from '@getbrevo/brevo';
import { TransactionalEmailsApi } from '@getbrevo/brevo';
import { EmployeeEntity } from '@/entities/master/employee.entity';
import { RedisService } from '@/app/configs/redis';
import { REDIS_KEY_NEW_EMPLOYEE_OTP } from '@/common/constants/redis-key.constant';

@Injectable()
export class EmailService {
   private readonly apiInstance: TransactionalEmailsApi;

   constructor(
      private readonly configService: ConfigService,
      private readonly redisService: RedisService,
   ) {
      // Brevo
      this.apiInstance = new brevo.TransactionalEmailsApi();

      this.apiInstance.setApiKey(0, this.configService.get<string>('SENDINBLUE_API_KEY'));
   }

   async sendUserConfirmation(employee: EmployeeEntity, otp: string) {
      const sendSmtpEmail: brevo.SendSmtpEmail = new brevo.SendSmtpEmail();

      sendSmtpEmail.subject = this.configService.get<string>('COMPANY_NAME') + '- OTP Xác thực';
      sendSmtpEmail.templateId = 5;
      sendSmtpEmail.to = [
         { email: employee.email, name: employee.lastName + ' ' + employee.firstName },
      ];
      sendSmtpEmail.replyTo = { email: 'support@yourdomain.com', name: 'Support' };
      sendSmtpEmail.sender = { email: 'ldmhieu205@gmail.com', name: 'Verify account employee' };
      sendSmtpEmail.headers = { 'Some-Custom-Name': 'unique-id-1234' };
      const raw = `${employee.employeeId}:${otp}`;
      const encoded = Buffer.from(raw).toString('base64');

      sendSmtpEmail.params = {
         brand: this.configService.get<string>('COMPANY_NAME'),
         url: `${this.configService.get<string>('COMPANY_DOMAIN')}${this.configService.get<string>('COMPANY_ROUTE_UPDATE_PASSWORD')}/${encoded}`,
      };

      try {
         this.redisService.set(
            `${REDIS_KEY_NEW_EMPLOYEE_OTP}:${employee.employeeId}:${otp}`,
            1,
            60 * 5,
         );
         await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      } catch (error) {
         throw error;
      }
   }
}

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AuthPayload } from '../interfaces/microservice.interface';

@Injectable()
export class AuthService {
   private readonly logger = new Logger(AuthService.name);
   private readonly userServiceUrl: string;

   constructor(
      private readonly httpService: HttpService,
      private readonly configService: ConfigService,
   ) {
      this.userServiceUrl = this.configService.get<string>(
         'USER_SERVICE_URL',
         'http://localhost:3000',
      );
   }

   async validateToken(token: string): Promise<AuthPayload> {
      try {
         const response = await firstValueFrom(
            this.httpService.post(
               `${this.userServiceUrl}/auth/validate-token`,
               {},
               {
                  headers: {
                     Authorization: `Bearer ${token}`,
                  },
                  timeout: 10000,
               },
            ),
         );

         if (response.status === 200 && response.data) {
            return response.data;
         }

         throw new UnauthorizedException('Invalid token response');
      } catch (error) {
         this.logger.error(`Token validation failed: ${error.message}`);

         if (error.response?.status === 401) {
            throw new UnauthorizedException('Invalid or expired token');
         }

         throw new UnauthorizedException('Token validation service unavailable');
      }
   }

   extractTokenFromHeader(authHeader: string): string | null {
      if (!authHeader) {
         return null;
      }

      const [bearer, token] = authHeader.split(' ');

      if (bearer !== 'Bearer' || !token) {
         return null;
      }

      return token;
   }
}

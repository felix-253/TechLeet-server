import { Injectable, NestMiddleware, UnauthorizedException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

// Extend Express Request interface to include user property
declare global {
   namespace Express {
      interface Request {
         user?: any;
      }
   }
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
   private readonly logger = new Logger(AuthMiddleware.name);

   // Paths that don't require authentication
   private readonly publicPaths = [
      '/api/v1/user-service/auth/login',
      '/api/v1/user-service/auth/create-password',
      '/health',
      '/api',
      '/swagger',
      '/swagger/json',
      '/api-docs',
      // Health checks for all services
      '/api/v1/user-service/health',
      '/api/v1/company-service/health',
      '/api/v1/recruitment-service/health',
   ];

   constructor(private readonly authService: AuthService) {}

   async use(req: Request, res: Response, next: NextFunction): Promise<void> {
      const { originalUrl, method } = req;

      // Skip authentication for public paths
      if (this.isPublicPath(originalUrl)) {
         return next();
      }

      // Skip authentication for OPTIONS requests (CORS preflight)
      if (method === 'OPTIONS') {
         return next();
      }

      try {
         const authHeader = req.headers.authorization;

         if (!authHeader) {
            throw new UnauthorizedException('Authorization header is required');
         }

         const token = this.authService.extractTokenFromHeader(authHeader);

         if (!token) {
            throw new UnauthorizedException('Invalid authorization header format');
         }

         // Validate token with user-service
         const authPayload = await this.authService.validateToken(token);

         // Add user information to request object
         req.user = authPayload;

         // Add user information to headers for downstream services
         req.headers['x-user-id'] = authPayload.employeeId.toString();
         req.headers['x-user-permissions'] = JSON.stringify(authPayload.permissions);

         if (authPayload.isAdmin !== undefined) {
            req.headers['x-user-is-admin'] = authPayload.isAdmin.toString();
         }

         this.logger.log(
            `Authenticated user ${authPayload.employeeId} for ${method} ${originalUrl}`,
         );

         next();
      } catch (error) {
         this.logger.error(`Authentication failed for ${method} ${originalUrl}: ${error.message}`);

         if (error instanceof UnauthorizedException) {
            res.status(401).json({
               statusCode: 401,
               message: error.message,
               error: 'Unauthorized',
            });
         } else {
            res.status(500).json({
               statusCode: 500,
               message: 'Internal server error during authentication',
               error: 'Internal Server Error',
            });
         }
      }
   }

   private isPublicPath(path: string): boolean {
      return this.publicPaths.some((publicPath) => {
         if (publicPath.endsWith('*')) {
            return path.startsWith(publicPath.slice(0, -1));
         }
         return path === publicPath || path.startsWith(publicPath);
      });
   }
}

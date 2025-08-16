import {
   CanActivate,
   ExecutionContext,
   HttpStatus,
   Injectable,
   UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class AuthGuard implements CanActivate {
   canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
      const request = context.switchToHttp().getRequest();
      if (!request.headers.authorization)
         throw new UnauthorizedException('UnauthorizedException: You must login');
      return true;
   }
}

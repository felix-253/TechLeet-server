import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';

@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'refresh') {
   constructor(private readonly authService: AuthService) {
      super({
         jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
         ignoreExpiration: false,
         secretOrKey: process.env.JWT_SECRET,
         passReqToCallback: true,
      });
   }
   async validate(payload: any) {
      return payload; // Return the payload directly
   }
}

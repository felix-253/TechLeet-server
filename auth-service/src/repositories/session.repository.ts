import { SessionEntity } from '../entities/transaction/session.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class SessionRepository {
   constructor(
      @InjectRepository(SessionEntity)
      private sessionRepository: Repository<SessionEntity>,
   ) {}
}

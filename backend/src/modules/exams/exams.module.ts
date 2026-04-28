import { Module } from '@nestjs/common';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';
import { RejoinRequestsModule } from '../rejoin-requests/rejoin-requests.module';

@Module({
  imports: [RejoinRequestsModule],
  controllers: [ExamsController],
  providers: [ExamsService],
  exports: [ExamsService],
})
export class ExamsModule {}

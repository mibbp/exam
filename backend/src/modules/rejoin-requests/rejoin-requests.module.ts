import { Module } from '@nestjs/common';
import { RejoinRequestsController } from './rejoin-requests.controller';
import { RejoinRequestsService } from './rejoin-requests.service';

@Module({
  controllers: [RejoinRequestsController],
  providers: [RejoinRequestsService],
  exports: [RejoinRequestsService],
})
export class RejoinRequestsModule {}


import { Body, Controller, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ReviewRejoinRequestDto } from './dto/review-rejoin-request.dto';
import { RejoinRequestsService } from './rejoin-requests.service';

@Controller('rejoin-requests')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class RejoinRequestsController {
  constructor(private readonly rejoinRequestsService: RejoinRequestsService) {}

  @Post(':id/approve')
  @Roles('ADMIN')
  @Permissions('monitor.rejoin.review')
  approve(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewRejoinRequestDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.rejoinRequestsService.approve(id, user.sub, dto.reviewNote);
  }

  @Post(':id/reject')
  @Roles('ADMIN')
  @Permissions('monitor.rejoin.review')
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewRejoinRequestDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.rejoinRequestsService.reject(id, user.sub, dto.reviewNote);
  }
}


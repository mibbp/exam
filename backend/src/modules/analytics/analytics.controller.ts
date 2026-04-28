import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('exams/:id')
  @Roles('ADMIN')
  getExamAnalytics(@Param('id', ParseIntPipe) examId: number) {
    return this.analyticsService.examAnalytics(examId);
  }
}

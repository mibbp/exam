import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AttemptsService } from './attempts.service';
import { StartAttemptDto } from './dto/start-attempt.dto';
import { SaveAnswerDto } from './dto/save-answer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, JwtUser } from '../auth/decorators/current-user.decorator';
import { RejoinRequestsService } from '../rejoin-requests/rejoin-requests.service';
import { CreateRejoinRequestDto } from '../rejoin-requests/dto/create-rejoin-request.dto';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class AttemptsController {
  constructor(
    private readonly attemptsService: AttemptsService,
    private readonly rejoinRequestsService: RejoinRequestsService,
  ) {}

  @Post('attempts/start')
  @Roles('STUDENT')
  start(@Body() dto: StartAttemptDto, @CurrentUser() user: JwtUser) {
    return this.attemptsService.start(dto.examId, user);
  }

  @Get('attempts/:id')
  @Roles('STUDENT', 'ADMIN')
  detail(@Param('id', ParseIntPipe) attemptId: number, @CurrentUser() user: JwtUser) {
    return this.attemptsService.detail(attemptId, user.sub, user.role);
  }

  @Get('attempts/:id/question-nav')
  @Roles('STUDENT', 'ADMIN')
  questionNav(@Param('id', ParseIntPipe) attemptId: number, @CurrentUser() user: JwtUser) {
    return this.attemptsService.questionNav(attemptId, user.sub, user.role);
  }

  @Patch('attempts/:id/answers/:questionId')
  @Roles('STUDENT')
  saveAnswer(
    @Param('id', ParseIntPipe) attemptId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
    @Body() dto: SaveAnswerDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.attemptsService.saveAnswer(attemptId, questionId, user.sub, dto.answer);
  }

  @Post('attempts/:id/submit')
  @Roles('STUDENT')
  submit(@Param('id', ParseIntPipe) attemptId: number, @CurrentUser() user: JwtUser) {
    return this.attemptsService.submit(attemptId, user.sub);
  }

  @Get('attempts/:id/result')
  @Roles('STUDENT', 'ADMIN')
  result(@Param('id', ParseIntPipe) attemptId: number, @CurrentUser() user: JwtUser) {
    return this.attemptsService.result(attemptId, user.sub, user.role);
  }

  @Get('my-exams')
  @Roles('STUDENT')
  myExams(@CurrentUser() user: JwtUser) {
    return this.attemptsService.myExams(user);
  }

  @Get('student/dashboard')
  @Roles('STUDENT')
  studentDashboard(@CurrentUser() user: JwtUser) {
    return this.attemptsService.studentDashboard(user);
  }

  @Get('my-exams/:examId/records')
  @Roles('STUDENT')
  myExamRecords(@CurrentUser() user: JwtUser, @Param('examId', ParseIntPipe) examId: number) {
    return this.attemptsService.myExamRecords(user, examId);
  }

  @Get('my-wrong-questions')
  @Roles('STUDENT')
  myWrongQuestions(@CurrentUser() user: JwtUser, @Query('attemptId') attemptId?: string) {
    return this.attemptsService.myWrongQuestions(user.sub, attemptId ? Number(attemptId) : undefined);
  }

  @Post('anti-cheat/events')
  @Roles('STUDENT')
  antiCheat(
    @Body() body: { attemptId: number; eventType: string; message?: string },
    @CurrentUser() user: JwtUser,
  ) {
    return this.attemptsService.antiCheatEvent(body.attemptId, user.sub, body.eventType, body.message);
  }

  @Get('anti-cheat/events')
  @Roles('ADMIN')
  @Permissions('monitor.view')
  antiCheatLogs(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('keyword') keyword?: string,
    @Query('examId') examId?: string,
    @Query('eventType') eventType?: string,
  ) {
    return this.attemptsService.antiCheatLogs({
      page: Number(page || 1),
      pageSize: Number(pageSize || 20),
      keyword,
      examId: examId ? Number(examId) : undefined,
      eventType,
    });
  }

  @Post('attempts/:id/rejoin-requests')
  @Roles('STUDENT')
  createRejoinRequest(
    @Param('id', ParseIntPipe) attemptId: number,
    @Body() dto: CreateRejoinRequestDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.rejoinRequestsService.create(attemptId, user.sub, dto.reason);
  }
}

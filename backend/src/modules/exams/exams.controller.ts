import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ExamsService } from './exams.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, JwtUser } from '../auth/decorators/current-user.decorator';
import { UpdateExamDto } from './dto/update-exam.dto';
import { ListExamsDto } from './dto/list-exams.dto';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { RejoinRequestsService } from '../rejoin-requests/rejoin-requests.service';

@Controller('exams')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class ExamsController {
  constructor(
    private readonly examsService: ExamsService,
    private readonly rejoinRequestsService: RejoinRequestsService,
  ) {}

  @Get()
  @Roles('ADMIN', 'STUDENT')
  findAll(@CurrentUser() user: JwtUser, @Query() query: ListExamsDto) {
    if (user.role === 'ADMIN' && !user.permissions.includes('exams.view')) {
      throw new ForbiddenException('No permission');
    }
    return this.examsService.findAll(user, query);
  }

  @Get(':id')
  @Roles('ADMIN', 'STUDENT')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtUser) {
    if (user.role === 'ADMIN' && !user.permissions.includes('exams.view')) {
      throw new ForbiddenException('No permission');
    }
    return this.examsService.findOne(id, user);
  }

  @Post()
  @Roles('ADMIN')
  @Permissions('exams.create')
  create(@Body() dto: CreateExamDto, @CurrentUser() user: JwtUser) {
    return this.examsService.create(dto, user.sub);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @Permissions('exams.update')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateExamDto) {
    return this.examsService.update(id, dto);
  }

  @Post(':id/publish')
  @Roles('ADMIN')
  @Permissions('exams.publish')
  publish(@Param('id', ParseIntPipe) id: number) {
    return this.examsService.publish(id);
  }

  @Post(':id/unpublish')
  @Roles('ADMIN')
  @Permissions('exams.publish')
  unpublish(@Param('id', ParseIntPipe) id: number) {
    return this.examsService.unpublish(id);
  }

  @Post(':id/close')
  @Roles('ADMIN')
  @Permissions('exams.close')
  close(@Param('id', ParseIntPipe) id: number) {
    return this.examsService.close(id);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @Permissions('exams.update')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.examsService.remove(id);
  }

  @Get(':id/scoreboard')
  @Roles('ADMIN')
  @Permissions('results.view')
  scoreboard(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('keyword') keyword?: string,
    @Query('status') status?: string,
  ) {
    return this.examsService.scoreboard(id, Number(page || 1), Number(pageSize || 20), keyword, status);
  }

  @Get(':id/results/export')
  @Roles('ADMIN')
  @Permissions('results.export')
  exportResults(@Param('id', ParseIntPipe) id: number) {
    return this.examsService.exportResults(id);
  }

  @Get(':id/monitor')
  @Roles('ADMIN')
  @Permissions('monitor.view')
  monitor(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('keyword') keyword?: string,
    @Query('status') status?: string,
  ) {
    return this.examsService.monitor(id, Number(page || 1), Number(pageSize || 20), keyword, status);
  }

  @Get(':id/rejoin-requests')
  @Roles('ADMIN')
  @Permissions('monitor.view')
  rejoinRequests(@Param('id', ParseIntPipe) id: number, @Query('status') status?: string) {
    return this.rejoinRequestsService.listByExam(id, status);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser, JwtUser } from '../auth/decorators/current-user.decorator';

@Controller('questions')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  @Roles('ADMIN')
  @Permissions('questions.create')
  create(@Body() dto: CreateQuestionDto) {
    return this.questionsService.create(dto);
  }

  @Get()
  @Roles('ADMIN', 'STUDENT')
  findAll(
    @Query('repositoryId') repositoryId?: string,
    @Query('type') type?: string,
    @Query('difficulty') difficulty?: string,
    @Query('hasAnalysis') hasAnalysis?: string,
    @Query('status') status?: string,
    @Query('tag') tag?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @CurrentUser() user?: JwtUser,
  ) {
    return this.questionsService.findAll({
      repositoryId: repositoryId ? Number(repositoryId) : undefined,
      type,
      difficulty: difficulty ? Number(difficulty) : undefined,
      hasAnalysis: hasAnalysis === undefined ? undefined : hasAnalysis === 'true',
      status,
      tag,
      includeAnswer: user?.role === 'ADMIN',
      keyword,
      page: Number(page || 1),
      pageSize: Number(pageSize || 20),
    });
  }

  @Get('export')
  @Roles('ADMIN')
  @Permissions('questions.export')
  exportQuestions(@Query('repositoryId') repositoryId?: string) {
    return this.questionsService.export(Number(repositoryId || 0) || undefined);
  }

  @Get('export-file')
  @Roles('ADMIN')
  @Permissions('questions.export')
  async exportQuestionsFile(
    @Query('repositoryId') repositoryId: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const buffer = await this.questionsService.exportAsWorkbook(Number(repositoryId || 0) || undefined);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="questions-export.xlsx"');
    return buffer;
  }

  @Get('import-template')
  @Roles('ADMIN')
  @Permissions('questions.import')
  async downloadImportTemplate(@Res({ passthrough: true }) res: Response) {
    const buffer = this.questionsService.buildImportTemplateWorkbook();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="questions-import-template.xlsx"');
    return buffer;
  }

  @Patch(':id')
  @Roles('ADMIN')
  @Permissions('questions.update')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateQuestionDto) {
    return this.questionsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @Permissions('questions.delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.questionsService.remove(id);
  }

  @Post('import')
  @Roles('ADMIN')
  @Permissions('questions.import')
  @UseInterceptors(FileInterceptor('file'))
  importQuestions(
    @UploadedFile() file?: { buffer: Buffer },
    @Query('repositoryId') repositoryId?: string,
  ) {
    if (!file) {
      return { total: 0, successCount: 0, errors: [{ row: 0, reason: 'missing file' }] };
    }
    return this.questionsService.importFromSheet(file.buffer, repositoryId ? Number(repositoryId) : undefined);
  }
}

import { BadRequestException, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as XLSX from 'xlsx';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

function pickCell(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      return String(row[key]).trim();
    }
  }
  return '';
}

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  private makeHash(content: string, options: string[]) {
    return crypto.createHash('sha256').update(`${content.trim()}|${options.join('|')}`).digest('hex');
  }

  async create(dto: CreateQuestionDto) {
    const contentHash = this.makeHash(dto.content, dto.options);
    return this.prisma.question.upsert({
      where: { contentHash },
      update: {
        ...dto,
        difficulty: dto.difficulty ?? 1,
        tags: dto.tags ?? [],
        knowledgePoints: dto.knowledgePoints ?? [],
        status: dto.status ?? 'ACTIVE',
      },
      create: {
        ...dto,
        difficulty: dto.difficulty ?? 1,
        tags: dto.tags ?? [],
        knowledgePoints: dto.knowledgePoints ?? [],
        status: dto.status ?? 'ACTIVE',
        contentHash,
      },
      include: { repository: true },
    });
  }

  async findAll(params: {
    repositoryId?: number;
    type?: string;
    difficulty?: number;
    hasAnalysis?: boolean;
    status?: string;
    tag?: string;
    includeAnswer?: boolean;
    keyword?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = params.page ?? 1;
    const pageSize = Math.min(params.pageSize ?? 20, 100);
    const where = {
      ...(params.repositoryId ? { repositoryId: params.repositoryId } : {}),
      ...(params.type ? { type: params.type as never } : {}),
      ...(params.difficulty ? { difficulty: params.difficulty } : {}),
      ...(params.status ? { status: params.status as never } : {}),
      ...(params.hasAnalysis === undefined
        ? {}
        : params.hasAnalysis
          ? { analysis: { not: null } }
          : { OR: [{ analysis: null }, { analysis: '' }] }),
      ...(params.keyword ? { content: { contains: params.keyword } } : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.question.count({ where }),
      this.prisma.question.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { repository: true },
      }),
    ]);
    const filtered = !params.tag
      ? rows
      : rows.filter((q) => Array.isArray(q.tags) && q.tags.includes(params.tag as never));

    return {
      total,
      page,
      pageSize,
      rows: params.includeAnswer === false ? filtered.map((q) => ({ ...q, answer: '' })) : filtered,
    };
  }

  async update(id: number, dto: UpdateQuestionDto) {
    const original = await this.prisma.question.findUnique({ where: { id } });
    if (!original) {
      throw new BadRequestException('Question not found');
    }
    const mergedOptions = dto.options ?? (original.options as string[]);
    const mergedContent = dto.content ?? original.content;
    const contentHash = this.makeHash(mergedContent, mergedOptions);
    return this.prisma.question.update({
      where: { id },
      data: {
        ...dto,
        contentHash,
      },
      include: { repository: true },
    });
  }

  async remove(id: number) {
    await this.prisma.question.delete({ where: { id } });
    return { ok: true };
  }

  async export(repositoryId?: number) {
    const rows = await this.prisma.question.findMany({
      where: repositoryId ? { repositoryId } : undefined,
      orderBy: { id: 'desc' },
      include: { repository: true },
    });
    return { rows };
  }

  async exportAsWorkbook(repositoryId?: number) {
    const rows = await this.prisma.question.findMany({
      where: repositoryId ? { repositoryId } : undefined,
      orderBy: { id: 'desc' },
      include: { repository: true },
    });
    const data = rows.map((row) => {
      const options = Array.isArray(row.options) ? (row.options as string[]) : [];
      const tags = Array.isArray(row.tags) ? (row.tags as string[]) : [];
      const knowledgePoints = Array.isArray(row.knowledgePoints) ? (row.knowledgePoints as string[]) : [];
      return {
        content: row.content,
        type: row.type,
        optionA: options[0] || '',
        optionB: options[1] || '',
        optionC: options[2] || '',
        optionD: options[3] || '',
        answer: row.answer,
        score: row.score,
        difficulty: row.difficulty,
        tags: tags.join(','),
        knowledgePoints: knowledgePoints.join(','),
        analysis: row.analysis || '',
        source: row.source || '',
        status: row.status,
        repository: row.repository?.name || '',
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'questions');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  buildImportTemplateWorkbook() {
    const templateRows = [
      {
        content: 'TCP three-way handshake: which flag appears in the second handshake?',
        optionA: 'SYN',
        optionB: 'SYN,ACK',
        optionC: 'ACK',
        optionD: 'FIN',
        answer: 'B',
        score: 5,
        difficulty: 2,
        tags: 'network,basics',
        knowledgePoints: 'TCP',
        analysis: 'Server responds with SYN+ACK in the second handshake.',
      },
    ];
    const tipsRows = [
      { note: 'Required fields: content, at least two options, answer.' },
      { note: 'For multiple answers use comma-separated letters, e.g. A,C.' },
      { note: 'Tags and knowledge points use comma-separated values.' },
      { note: 'Supported answer letters: A/B/C/D.' },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(templateRows), 'template');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(tipsRows), 'notes');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  async importFromSheet(buffer: Buffer, repositoryId?: number) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    const errors: Array<{ row: number; reason: string }> = [];
    let successCount = 0;

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const content = pickCell(row, ['content', '题目内容']);
      if (!content) {
        errors.push({ row: i + 2, reason: '题目内容为空' });
        continue;
      }

      const optionA = pickCell(row, ['optionA', 'A', '选项A']);
      const optionB = pickCell(row, ['optionB', 'B', '选项B']);
      const optionC = pickCell(row, ['optionC', 'C', '选项C']);
      const optionD = pickCell(row, ['optionD', 'D', '选项D']);
      const answer = pickCell(row, ['answer', '正确答案']).replace(/\s+/g, '');
      const score = Number(pickCell(row, ['score', '题目分值']) || 1);
      const analysis = pickCell(row, ['analysis', '题目解析']);
      const difficulty = Number(pickCell(row, ['difficulty', '难度']) || 1);
      const tags = pickCell(row, ['tags', '标签'])
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      const knowledgePoints = pickCell(row, ['knowledgePoints', '知识点'])
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

      const options = [optionA, optionB, optionC, optionD].filter(Boolean);
      if (options.length < 2 || !answer) {
        errors.push({ row: i + 2, reason: '选项或答案不合法' });
        continue;
      }

      const answerParts = answer.split(',').map((x) => x.trim()).filter(Boolean);
      const invalidAnswers = answerParts.some((item) => !['A', 'B', 'C', 'D'].includes(item));
      if (invalidAnswers) {
        errors.push({ row: i + 2, reason: '正确答案必须是 A/B/C/D，多个答案用逗号分隔' });
        continue;
      }

      const type = answerParts.length > 1 ? 'MULTIPLE' : options.length <= 2 ? 'TRUE_FALSE' : 'SINGLE';
      const contentHash = this.makeHash(content, options);

      await this.prisma.question.upsert({
        where: { contentHash },
        update: {
          repositoryId,
          type: type as never,
          content,
          options,
          answer,
          score: Number.isFinite(score) ? score : 1,
          analysis,
          difficulty: Number.isFinite(difficulty) ? difficulty : 1,
          tags,
          knowledgePoints,
          status: 'ACTIVE',
        },
        create: {
          repositoryId,
          type: type as never,
          content,
          options,
          answer,
          score: Number.isFinite(score) ? score : 1,
          analysis,
          difficulty: Number.isFinite(difficulty) ? difficulty : 1,
          tags,
          knowledgePoints,
          status: 'ACTIVE',
          contentHash,
        },
      });
      successCount += 1;
    }

    return { total: rows.length, successCount, errors };
  }
}

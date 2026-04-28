import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { AttemptStatus, ExamStatus, OpenType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { JwtUser } from '../auth/decorators/current-user.decorator';
import { CreateExamDto } from './dto/create-exam.dto';
import { ListExamsDto } from './dto/list-exams.dto';
import { UpdateExamDto } from './dto/update-exam.dto';

@Injectable()
export class ExamsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertQuestionConfigs(questionConfigs: Array<{ questionId: number }>) {
    const ids = questionConfigs.map((x) => x.questionId);
    const uniqueIds = Array.from(new Set(ids));
    if (uniqueIds.length !== ids.length) {
      throw new BadRequestException('Duplicate question in exam');
    }
    const exists = await this.prisma.question.count({ where: { id: { in: uniqueIds } } });
    if (exists !== uniqueIds.length) {
      throw new BadRequestException('Some questions do not exist');
    }
  }

  private canAccessExam(user: JwtUser, exam: { openType: OpenType; allowedUserIds: unknown; allowedRoleIds: unknown }) {
    if (user.role === 'ADMIN') {
      return true;
    }
    if (exam.openType === 'PUBLIC') {
      return true;
    }
    if (exam.openType === 'USERS') {
      return Array.isArray(exam.allowedUserIds) && exam.allowedUserIds.includes(user.sub);
    }
    if (exam.openType === 'ROLES') {
      return Array.isArray(exam.allowedRoleIds)
        && exam.allowedRoleIds.some((roleId) => (user.roleIds ?? []).includes(Number(roleId)));
    }
    return false;
  }

  async create(dto: CreateExamDto, creatorId: number) {
    await this.assertQuestionConfigs(dto.questionConfigs);
    return this.prisma.exam.create({
      data: {
        title: dto.title,
        description: dto.description,
        durationMinutes: dto.durationMinutes,
        passScore: dto.passScore ?? Math.max(1, Math.round(dto.questionConfigs.reduce((sum, item) => sum + item.score, 0) * 0.6)),
        maxAttempts: dto.maxAttempts ?? 1,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        status: ExamStatus.DRAFT,
        isPublished: false,
        openType: dto.openType ?? 'PUBLIC',
        allowedUserIds: dto.allowedUserIds ?? [],
        allowedRoleIds: dto.allowedRoleIds ?? [],
        allowReview: dto.allowReview ?? true,
        shuffleQuestions: dto.shuffleQuestions ?? false,
        shuffleOptions: dto.shuffleOptions ?? false,
        antiCheatEnabled: dto.antiCheatEnabled ?? true,
        antiCheatThreshold: dto.antiCheatThreshold ?? 3,
        showResultMode: dto.showResultMode ?? 'AFTER_SUBMIT',
        creatorId,
        examQuestions: {
          create: dto.questionConfigs.map((q, idx) => ({
            questionId: q.questionId,
            orderNo: idx + 1,
            scoreOverride: q.score,
          })),
        },
      },
      include: { examQuestions: true },
    });
  }

  async update(id: number, dto: UpdateExamDto) {
    const existing = await this.prisma.exam.findUnique({ where: { id } });
    if (!existing) {
      throw new BadRequestException('Exam not found');
    }
    if (existing.status === ExamStatus.CLOSED) {
      throw new BadRequestException('Closed exam cannot be edited');
    }
    if (dto.questionConfigs && dto.questionConfigs.length > 0) {
      await this.assertQuestionConfigs(dto.questionConfigs);
    }
    return this.prisma.exam.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.durationMinutes !== undefined ? { durationMinutes: dto.durationMinutes } : {}),
        ...(dto.passScore !== undefined ? { passScore: dto.passScore } : {}),
        ...(dto.maxAttempts !== undefined ? { maxAttempts: dto.maxAttempts } : {}),
        ...(dto.startsAt !== undefined ? { startsAt: dto.startsAt ? new Date(dto.startsAt) : null } : {}),
        ...(dto.endsAt !== undefined ? { endsAt: dto.endsAt ? new Date(dto.endsAt) : null } : {}),
        ...(dto.openType !== undefined ? { openType: dto.openType } : {}),
        ...(dto.allowedUserIds !== undefined ? { allowedUserIds: dto.allowedUserIds } : {}),
        ...(dto.allowedRoleIds !== undefined ? { allowedRoleIds: dto.allowedRoleIds } : {}),
        ...(dto.allowReview !== undefined ? { allowReview: dto.allowReview } : {}),
        ...(dto.shuffleQuestions !== undefined ? { shuffleQuestions: dto.shuffleQuestions } : {}),
        ...(dto.shuffleOptions !== undefined ? { shuffleOptions: dto.shuffleOptions } : {}),
        ...(dto.antiCheatEnabled !== undefined ? { antiCheatEnabled: dto.antiCheatEnabled } : {}),
        ...(dto.antiCheatThreshold !== undefined ? { antiCheatThreshold: dto.antiCheatThreshold } : {}),
        ...(dto.showResultMode !== undefined ? { showResultMode: dto.showResultMode } : {}),
        ...(dto.questionConfigs
          ? {
              examQuestions: {
                deleteMany: {},
                create: dto.questionConfigs.map((q, idx) => ({
                  questionId: q.questionId,
                  orderNo: idx + 1,
                  scoreOverride: q.score,
                })),
              },
            }
          : {}),
      },
      include: { examQuestions: true },
    });
  }

  async findAll(user: JwtUser, query: ListExamsDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 20, 100);

    const commonWhere = {
      ...(query.keyword ? { title: { contains: query.keyword } } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.openType ? { openType: query.openType } : {}),
      ...(query.dateFrom ? { createdAt: { gte: new Date(query.dateFrom) } } : {}),
      ...(query.dateTo ? { createdAt: { lte: new Date(query.dateTo) } } : {}),
    };

    const where = user.role === 'ADMIN' ? commonWhere : { ...commonWhere, status: ExamStatus.PUBLISHED };

    const [total, rows] = await Promise.all([
      this.prisma.exam.count({ where }),
      this.prisma.exam.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          examQuestions: true,
          creator: { select: { id: true, username: true, displayName: true } },
          _count: { select: { attempts: true } },
        },
      }),
    ]);

    const filteredRows = user.role === 'ADMIN' ? rows : rows.filter((row) => this.canAccessExam(user, row));
    return {
      total: user.role === 'ADMIN' ? total : filteredRows.length,
      page,
      pageSize,
      rows: filteredRows,
    };
  }

  async findOne(id: number, user: JwtUser) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: {
        examQuestions: { include: { question: true }, orderBy: { orderNo: 'asc' } },
        creator: { select: { id: true, username: true, displayName: true } },
        _count: { select: { attempts: true } },
      },
    });
    if (!exam) {
      throw new BadRequestException('Exam not found');
    }
    if (user.role !== 'ADMIN') {
      if (exam.status !== ExamStatus.PUBLISHED && !exam.isPublished) {
        throw new ForbiddenException('No permission');
      }
      if (!this.canAccessExam(user, exam)) {
        throw new ForbiddenException('No permission');
      }
    }
    if (user.role !== 'ADMIN') {
      return {
        ...exam,
        examQuestions: exam.examQuestions.map((eq) => ({
          ...eq,
          question: {
            ...eq.question,
            answer: '',
          },
        })),
      };
    }
    return exam;
  }

  publish(id: number) {
    return this.prisma.exam.update({
      where: { id },
      data: { status: ExamStatus.PUBLISHED, isPublished: true },
    });
  }

  unpublish(id: number) {
    return this.prisma.exam.update({
      where: { id },
      data: { status: ExamStatus.DRAFT, isPublished: false },
    });
  }

  close(id: number) {
    return this.prisma.exam.update({
      where: { id },
      data: { status: ExamStatus.CLOSED, isPublished: false },
    });
  }

  async remove(id: number) {
    await this.prisma.exam.delete({ where: { id } });
    return { ok: true };
  }

  async scoreboard(examId: number, page = 1, pageSize = 20, keyword?: string, status?: string, latestOnly = false) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      select: { passScore: true },
    });
    if (!exam) {
      throw new BadRequestException('Exam not found');
    }
    const passScore = exam.passScore;
    const normalizedPage = Math.max(page || 1, 1);
    const normalizedPageSize = Math.min(Math.max(pageSize || 20, 1), 100);
    const userWhere = keyword
      ? {
          user: {
            OR: [{ username: { contains: keyword } }, { displayName: { contains: keyword } }],
          },
        }
      : {};

    if (!latestOnly) {
      const where = {
        examId,
        ...(status ? { status: status as never } : {}),
        ...userWhere,
      };
      const [total, rows] = await Promise.all([
        this.prisma.examAttempt.count({ where }),
        this.prisma.examAttempt.findMany({
          where,
          orderBy: [{ attemptNo: 'desc' }, { id: 'desc' }],
          skip: (normalizedPage - 1) * normalizedPageSize,
          take: normalizedPageSize,
          include: { user: true },
        }),
      ]);
      const avgScore = rows.length > 0 ? rows.reduce((sum, item) => sum + (item.score ?? 0), 0) / rows.length : 0;
      const passCount = rows.filter((item) => (item.score ?? 0) >= passScore).length;
      return {
        total,
        page: normalizedPage,
        pageSize: normalizedPageSize,
        latestOnly: false,
        stats: {
          participantCount: rows.length,
          avgScore,
          passRate: rows.length > 0 ? passCount / rows.length : 0,
        },
        rows: rows.map((r) => ({
          id: r.id,
          attemptNo: r.attemptNo,
          userId: r.userId,
          username: r.user.username,
          displayName: r.user.displayName,
          status: r.status,
          score: r.score,
          startedAt: r.startedAt,
          submittedAt: r.submittedAt,
          antiCheatViolationCount: r.antiCheatViolationCount,
        })),
      };
    }

    const allRows = await this.prisma.examAttempt.findMany({
      where: { examId, ...userWhere },
      orderBy: [{ userId: 'asc' }, { attemptNo: 'desc' }, { id: 'desc' }],
      include: { user: true },
    });
    const latestByUser = new Map<number, (typeof allRows)[number]>();
    for (const row of allRows) {
      if (!latestByUser.has(row.userId)) {
        latestByUser.set(row.userId, row);
      }
    }
    let latestRows = Array.from(latestByUser.values());
    if (status) {
      latestRows = latestRows.filter((item) => item.status === status);
    }
    latestRows.sort((a, b) => b.id - a.id);
    const total = latestRows.length;
    const pagedRows = latestRows.slice(
      (normalizedPage - 1) * normalizedPageSize,
      (normalizedPage - 1) * normalizedPageSize + normalizedPageSize,
    );
    const avgScore = latestRows.length > 0
      ? latestRows.reduce((sum, item) => sum + (item.score ?? 0), 0) / latestRows.length
      : 0;
    const passCount = latestRows.filter((item) => (item.score ?? 0) >= passScore).length;

    return {
      total,
      page: normalizedPage,
      pageSize: normalizedPageSize,
      latestOnly: true,
      stats: {
        participantCount: latestRows.length,
        avgScore,
        passRate: latestRows.length > 0 ? passCount / latestRows.length : 0,
      },
      rows: pagedRows.map((r) => ({
        id: r.id,
        attemptNo: r.attemptNo,
        userId: r.userId,
        username: r.user.username,
        displayName: r.user.displayName,
        status: r.status,
        score: r.score,
        startedAt: r.startedAt,
        submittedAt: r.submittedAt,
        antiCheatViolationCount: r.antiCheatViolationCount,
      })),
    };
  }

  async exportResults(examId: number) {
    const rows = await this.prisma.examAttempt.findMany({
      where: { examId },
      orderBy: [{ attemptNo: 'desc' }, { id: 'desc' }],
      include: { user: true },
    });
    return {
      rows: rows.map((attempt) => ({
        id: attempt.id,
        attemptNo: attempt.attemptNo,
        username: attempt.user.username,
        displayName: attempt.user.displayName,
        status: attempt.status,
        score: attempt.score,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
      })),
    };
  }

  async monitor(examId: number, page = 1, pageSize = 20, keyword?: string, status?: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: { examQuestions: { select: { questionId: true } } },
    });
    if (!exam) {
      throw new BadRequestException('Exam not found');
    }

    const normalizedPage = Math.max(page || 1, 1);
    const normalizedPageSize = Math.min(Math.max(pageSize || 20, 1), 100);
    const filterStatuses = status && Object.values(AttemptStatus).includes(status as AttemptStatus)
      ? [status as AttemptStatus]
      : [AttemptStatus.IN_PROGRESS, AttemptStatus.FORCED_SUBMITTED];

    const where = {
      examId,
      status: { in: filterStatuses },
      ...(keyword
        ? {
            user: {
              OR: [{ username: { contains: keyword } }, { displayName: { contains: keyword } }],
            },
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.examAttempt.count({ where }),
      this.prisma.examAttempt.findMany({
        where,
        orderBy: [{ status: 'asc' }, { id: 'desc' }],
        skip: (normalizedPage - 1) * normalizedPageSize,
        take: normalizedPageSize,
        include: {
          user: { select: { id: true, username: true, displayName: true } },
          details: { select: { answer: true } },
          antiCheatEvents: { select: { createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 },
          rejoinRequests: { select: { id: true }, where: { status: 'PENDING' }, take: 1 },
        },
      }),
    ]);

    const questionCount = exam.examQuestions.length;
    return {
      examId,
      total,
      page: normalizedPage,
      pageSize: normalizedPageSize,
      rows: rows.map((attempt) => {
        const answeredCount = attempt.details.filter((detail) => Boolean(detail.answer?.trim())).length;
        const latestAntiCheatAt = attempt.antiCheatEvents[0]?.createdAt ?? null;
        const lastActivityAt = [attempt.lastSavedAt, latestAntiCheatAt, attempt.updatedAt]
          .filter(Boolean)
          .sort((a, b) => (a && b ? b.getTime() - a.getTime() : 0))[0] ?? null;

        return {
          attemptId: attempt.id,
          examId: attempt.examId,
          userId: attempt.userId,
          username: attempt.user.username,
          displayName: attempt.user.displayName,
          status: attempt.status,
          startedAt: attempt.startedAt,
          submittedAt: attempt.submittedAt,
          lastSavedAt: attempt.lastSavedAt,
          lastActivityAt,
          latestAntiCheatAt,
          antiCheatViolationCount: attempt.antiCheatViolationCount,
          questionCount,
          answeredCount,
          progressPercent: questionCount > 0 ? Math.round((answeredCount / questionCount) * 100) : 0,
          hasPendingRejoinRequest: attempt.rejoinRequests.length > 0,
        };
      }),
    };
  }
}


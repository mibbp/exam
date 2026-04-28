import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { AttemptStatus, ExamStatus, RejoinRequestStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RejoinRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(attemptId: number, studentId: number, reason?: string) {
    const attempt = await this.prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: { exam: true },
    });

    if (!attempt || attempt.userId !== studentId) {
      throw new ForbiddenException('No permission');
    }
    if (attempt.status !== AttemptStatus.FORCED_SUBMITTED) {
      throw new BadRequestException('Only forced-submitted attempt can request rejoin');
    }
    if (attempt.exam.status !== ExamStatus.PUBLISHED) {
      throw new BadRequestException('Exam is not active');
    }
    if (attempt.exam.endsAt && attempt.exam.endsAt <= new Date()) {
      throw new BadRequestException('Exam has ended');
    }

    const pending = await this.prisma.examRejoinRequest.findFirst({
      where: { attemptId, studentId, status: RejoinRequestStatus.PENDING },
      orderBy: { id: 'desc' },
    });
    if (pending) {
      throw new BadRequestException('Pending rejoin request already exists');
    }

    return this.prisma.examRejoinRequest.create({
      data: {
        attemptId,
        examId: attempt.examId,
        studentId,
        reason: reason?.trim() || null,
      },
    });
  }

  async listByExam(examId: number, status?: string) {
    const resolvedStatus = status && Object.values(RejoinRequestStatus).includes(status as RejoinRequestStatus)
      ? (status as RejoinRequestStatus)
      : undefined;

    return this.prisma.examRejoinRequest.findMany({
      where: { examId, ...(resolvedStatus ? { status: resolvedStatus } : {}) },
      include: {
        student: { select: { id: true, username: true, displayName: true } },
        reviewer: { select: { id: true, username: true, displayName: true } },
        attempt: { select: { id: true, status: true, antiCheatViolationCount: true, startedAt: true, submittedAt: true } },
      },
      orderBy: [{ status: 'asc' }, { id: 'desc' }],
    });
  }

  async latestForAttempt(attemptId: number, studentId: number) {
    return this.prisma.examRejoinRequest.findFirst({
      where: { attemptId, studentId },
      include: {
        reviewer: { select: { id: true, username: true, displayName: true } },
      },
      orderBy: { id: 'desc' },
    });
  }

  async approve(requestId: number, reviewerId: number, reviewNote?: string) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.examRejoinRequest.findUnique({
        where: { id: requestId },
        include: {
          attempt: true,
          exam: true,
        },
      });
      if (!request) {
        throw new BadRequestException('Rejoin request not found');
      }
      if (request.status !== RejoinRequestStatus.PENDING) {
        throw new BadRequestException('Rejoin request already processed');
      }
      if (request.exam.status !== ExamStatus.PUBLISHED) {
        throw new BadRequestException('Exam is not active');
      }
      if (request.exam.endsAt && request.exam.endsAt <= new Date()) {
        throw new BadRequestException('Exam has ended');
      }

      const elapsedSeconds = Math.max(0, Math.round((Date.now() - request.attempt.startedAt.getTime()) / 1000));

      await tx.examAttempt.update({
        where: { id: request.attemptId },
        data: {
          status: AttemptStatus.IN_PROGRESS,
          submittedAt: null,
          score: null,
          forcedSubmitReason: null,
          durationSeconds: elapsedSeconds,
        },
      });

      return tx.examRejoinRequest.update({
        where: { id: request.id },
        data: {
          status: RejoinRequestStatus.APPROVED,
          reviewNote: reviewNote?.trim() || null,
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
        },
        include: {
          student: { select: { id: true, username: true, displayName: true } },
          reviewer: { select: { id: true, username: true, displayName: true } },
          attempt: { select: { id: true, status: true, antiCheatViolationCount: true, startedAt: true, submittedAt: true } },
        },
      });
    });
  }

  async reject(requestId: number, reviewerId: number, reviewNote?: string) {
    const request = await this.prisma.examRejoinRequest.findUnique({ where: { id: requestId } });
    if (!request) {
      throw new BadRequestException('Rejoin request not found');
    }
    if (request.status !== RejoinRequestStatus.PENDING) {
      throw new BadRequestException('Rejoin request already processed');
    }

    return this.prisma.examRejoinRequest.update({
      where: { id: request.id },
      data: {
        status: RejoinRequestStatus.REJECTED,
        reviewNote: reviewNote?.trim() || null,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      },
      include: {
        student: { select: { id: true, username: true, displayName: true } },
        reviewer: { select: { id: true, username: true, displayName: true } },
        attempt: { select: { id: true, status: true, antiCheatViolationCount: true, startedAt: true, submittedAt: true } },
      },
    });
  }
}


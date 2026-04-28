import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async examAnalytics(examId: number) {
    const totalRegistered = await this.prisma.examAttempt.count({
      where: { examId },
    });
    const attempts = await this.prisma.examAttempt.findMany({
      where: { examId, status: { in: ['SUBMITTED', 'FORCED_SUBMITTED'] } },
      include: {
        details: true,
      },
    });

    const totalAttempts = attempts.length;
    const avgScore =
      totalAttempts === 0
        ? 0
        : attempts.reduce((sum: number, item: { score: number | null }) => sum + (item.score ?? 0), 0) / totalAttempts;
    const scoreList = attempts.map((x) => x.score ?? 0);
    const maxScore = scoreList.length ? Math.max(...scoreList) : 0;
    const minScore = scoreList.length ? Math.min(...scoreList) : 0;
    const submitRate = totalRegistered === 0 ? 0 : totalAttempts / totalRegistered;
    const antiCheatEvents = await this.prisma.antiCheatEvent.count({
      where: {
        attempt: { examId },
      },
    });
    return { totalAttempts, avgScore, maxScore, minScore, submitRate, antiCheatEvents };
  }
}

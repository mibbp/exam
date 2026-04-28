import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const [
      examCount,
      publishedExamCount,
      ongoingExamCount,
      repositoryCount,
      questionCount,
      userCount,
      recentExams,
      recentRepositories,
    ] = await Promise.all([
      this.prisma.exam.count(),
      this.prisma.exam.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.exam.count({
        where: {
          status: 'PUBLISHED',
          OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
        },
      }),
      this.prisma.questionRepository.count(),
      this.prisma.question.count(),
      this.prisma.user.count(),
      this.prisma.exam.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          _count: { select: { attempts: true } },
          creator: { select: { displayName: true, username: true } },
        },
      }),
      this.prisma.questionRepository.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { _count: { select: { questions: true } } },
      }),
    ]);

    return {
      stats: {
        examCount,
        publishedExamCount,
        ongoingExamCount,
        repositoryCount,
        questionCount,
        userCount,
      },
      shortcuts: [
        { key: 'new-exam', title: '新建考试', path: '/admin/exams' },
        { key: 'import-questions', title: '导入试题', path: '/admin/questions' },
        { key: 'roles', title: '角色管理', path: '/admin/access/roles' },
        { key: 'users', title: '用户管理', path: '/admin/access/users' },
      ],
      recentExams,
      recentRepositories,
    };
  }
}

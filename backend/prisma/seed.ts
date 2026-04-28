import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

const permissions: Array<[string, string, string]> = [
  ['dashboard.view', '查看工作台', 'dashboard'],
  ['repositories.view', '查看题库', 'question-bank'],
  ['repositories.create', '新建题库', 'question-bank'],
  ['repositories.update', '编辑题库', 'question-bank'],
  ['repositories.export', '导出题库', 'question-bank'],
  ['questions.view', '查看试题', 'question-bank'],
  ['questions.create', '新建试题', 'question-bank'],
  ['questions.update', '编辑试题', 'question-bank'],
  ['questions.delete', '删除试题', 'question-bank'],
  ['questions.import', '导入试题', 'question-bank'],
  ['questions.export', '导出试题', 'question-bank'],
  ['exams.view', '查看考试', 'exam-management'],
  ['exams.create', '创建考试', 'exam-management'],
  ['exams.update', '编辑考试', 'exam-management'],
  ['exams.publish', '发布考试', 'exam-management'],
  ['exams.close', '关闭考试', 'exam-management'],
  ['results.view', '查看成绩', 'exam-management'],
  ['results.export', '导出成绩', 'exam-management'],
  ['monitor.view', '查看考试监控', 'exam-monitor'],
  ['monitor.rejoin.review', '处理重入申请', 'exam-monitor'],
  ['roles.view', '查看角色', 'access-control'],
  ['roles.create', '创建角色', 'access-control'],
  ['roles.update', '编辑角色', 'access-control'],
  ['roles.assign', '授权角色', 'access-control'],
  ['users.view', '查看用户', 'access-control'],
  ['users.create', '创建用户', 'access-control'],
  ['users.update', '编辑用户', 'access-control'],
  ['users.reset-password', '重置密码', 'access-control'],
];

async function ensureRole(code: string, name: string, isSystem: boolean, permissionCodes: string[]) {
  const role = await prisma.role.upsert({
    where: { code },
    update: { name, isSystem },
    create: { code, name, isSystem },
  });

  const permissionRows = await prisma.permission.findMany({ where: { code: { in: permissionCodes } } });
  await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
  if (permissionRows.length > 0) {
    await prisma.rolePermission.createMany({
      data: permissionRows.map((permission) => ({ roleId: role.id, permissionId: permission.id })),
      skipDuplicates: true,
    });
  }
  return role;
}

async function ensureUserRole(userId: number, roleId: number) {
  await prisma.userRoleAssignment.upsert({
    where: { userId_roleId: { userId, roleId } },
    update: {},
    create: { userId, roleId },
  });
}

async function ensureQuestion(repositoryId: number, sample: {
  type: 'SINGLE' | 'MULTIPLE' | 'TRUE_FALSE';
  content: string;
  options: string[];
  answer: string;
  score: number;
  analysis: string;
  difficulty: number;
  tags: string[];
  knowledgePoints: string[];
  source: string;
}) {
  const contentHash = crypto
    .createHash('sha256')
    .update(`${sample.content.trim()}|${sample.options.join('|')}`)
    .digest('hex');

  return prisma.question.upsert({
    where: { contentHash },
    update: { ...sample, repositoryId, status: 'ACTIVE' },
    create: { ...sample, repositoryId, status: 'ACTIVE', contentHash },
  });
}

async function ensureExam(title: string, description: string, questionConfigs: Array<{ questionId: number; score: number }>) {
  const existing = await prisma.exam.findFirst({ where: { description } });
  if (existing) {
    return prisma.exam.update({
      where: { id: existing.id },
      data: {
        title,
        durationMinutes: 30,
        passScore: Math.max(1, Math.round(questionConfigs.reduce((sum, item) => sum + item.score, 0) * 0.6)),
        status: 'PUBLISHED',
        isPublished: true,
        openType: 'PUBLIC',
        examQuestions: {
          deleteMany: {},
          create: questionConfigs.map((item, index) => ({
            questionId: item.questionId,
            scoreOverride: item.score,
            orderNo: index + 1,
          })),
        },
      },
    });
  }

  return prisma.exam.create({
    data: {
      title,
      description,
      durationMinutes: 30,
      passScore: Math.max(1, Math.round(questionConfigs.reduce((sum, item) => sum + item.score, 0) * 0.6)),
      status: 'PUBLISHED',
      isPublished: true,
      openType: 'PUBLIC',
      allowReview: true,
      antiCheatEnabled: true,
      antiCheatThreshold: 3,
      showResultMode: 'AFTER_SUBMIT',
      examQuestions: {
        create: questionConfigs.map((item, index) => ({
          questionId: item.questionId,
          scoreOverride: item.score,
          orderNo: index + 1,
        })),
      },
    },
  });
}

async function main() {
  const adminPwd = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123', 10);
  const studentPwd = await bcrypt.hash(process.env.SEED_STUDENT_PASSWORD ?? 'Student@123', 10);

  for (const [code, name, category] of permissions) {
    await prisma.permission.upsert({
      where: { code },
      update: { name, category },
      create: { code, name, category },
    });
  }

  const adminRole = await ensureRole('admin', '系统管理员', true, permissions.map(([code]) => code));
  const studentRole = await ensureRole('student', '学生', true, []);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash: adminPwd, role: 'ADMIN', status: 'ACTIVE', displayName: '系统管理员' },
    create: { username: 'admin', passwordHash: adminPwd, role: 'ADMIN', status: 'ACTIVE', displayName: '系统管理员' },
  });

  const student = await prisma.user.upsert({
    where: { username: 'student' },
    update: { passwordHash: studentPwd, role: 'STUDENT', status: 'ACTIVE', displayName: '演示学生' },
    create: { username: 'student', passwordHash: studentPwd, role: 'STUDENT', status: 'ACTIVE', displayName: '演示学生' },
  });

  const student1 = await prisma.user.upsert({
    where: { username: 'student1' },
    update: { passwordHash: studentPwd, role: 'STUDENT', status: 'ACTIVE', displayName: '学生一号' },
    create: { username: 'student1', passwordHash: studentPwd, role: 'STUDENT', status: 'ACTIVE', displayName: '学生一号' },
  });

  await ensureUserRole(admin.id, adminRole.id);
  await ensureUserRole(student.id, studentRole.id);
  await ensureUserRole(student1.id, studentRole.id);

  const defaultRepo = await prisma.questionRepository.upsert({
    where: { id: 1 },
    update: { name: '默认题库', description: '系统初始化题库', category: '基础', status: 'ACTIVE' },
    create: { id: 1, name: '默认题库', description: '系统初始化题库', category: '基础', status: 'ACTIVE' },
  });

  const q1 = await ensureQuestion(defaultRepo.id, {
    type: 'SINGLE',
    content: 'React 中用于创建组件状态的 Hook 是哪一个？',
    options: ['useState', 'useMemo', 'useRef', 'useEffect'],
    answer: 'A',
    score: 5,
    analysis: 'useState 用于创建和更新局部状态。',
    difficulty: 2,
    tags: ['React', '前端'],
    knowledgePoints: ['Hooks'],
    source: '系统初始化',
  });

  const q2 = await ensureQuestion(defaultRepo.id, {
    type: 'MULTIPLE',
    content: '下面哪些属于 HTTP 常见请求方法？',
    options: ['GET', 'POST', 'TRACE', 'PATCH'],
    answer: 'A,B,D',
    score: 5,
    analysis: 'GET、POST、PATCH 都是常见业务接口方法。',
    difficulty: 2,
    tags: ['网络'],
    knowledgePoints: ['HTTP'],
    source: '系统初始化',
  });

  const q3 = await ensureQuestion(defaultRepo.id, {
    type: 'TRUE_FALSE',
    content: 'Prisma 可以用于定义数据库模型并生成客户端。',
    options: ['正确', '错误'],
    answer: 'A',
    score: 5,
    analysis: 'Prisma 的 schema 和 client 就是这个作用。',
    difficulty: 1,
    tags: ['后端'],
    knowledgePoints: ['Prisma'],
    source: '系统初始化',
  });

  await prisma.question.updateMany({
    where: { content: 'Which fruit is yellow?' },
    data: {
      repositoryId: defaultRepo.id,
      content: '下列哪种水果是黄色的？',
      options: ['苹果', '香蕉', '樱桃', '枣'],
      answer: 'B',
      score: 5,
      analysis: '香蕉是黄色的。',
      difficulty: 1,
      tags: ['常识'],
      source: '系统初始化',
      status: 'ACTIVE',
    },
  });

  await prisma.exam.updateMany({
    where: { title: 'Smoke Test Exam' },
    data: { title: '前端基础演示考试', description: 'seed-demo-front' },
  });

  await prisma.exam.updateMany({
    where: { description: 'api smoke' },
    data: { title: '综合能力演示考试', description: 'seed-demo-mixed' },
  });

  await ensureExam('前端基础演示考试', 'seed-demo-front', [{ questionId: q1.id, score: 5 }]);
  await ensureExam('综合能力演示考试', 'seed-demo-mixed', [
    { questionId: q1.id, score: 5 },
    { questionId: q2.id, score: 5 },
    { questionId: q3.id, score: 5 },
  ]);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });

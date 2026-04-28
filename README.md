# 在线考试系统

技术栈：
- 前端：React + Vite + Tailwind + Ant Design
- 后端：NestJS + Prisma + MySQL
- 部署：Docker Compose

## 快速启动
1. 复制环境变量
```bash
cp .env.example infra/.env
```
2. 启动基础服务
```bash
cd infra
docker compose --env-file .env up -d --build
```

## 本地开发
### 后端
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
npm run start:dev
```

### 前端
```bash
cd frontend
npm install
npm run dev
```

## 默认访问
- 前端：[http://localhost:18080](http://localhost:18080)
- 后端：[http://localhost:3000/api](http://localhost:3000/api)

## 默认账号
- 管理员：`admin / Admin@123`
- 学生：`student / Student@123`

## 服务器发布
推荐使用仓库内置脚本从本地直接发布到服务器。
详细文档见：`docs/DEPLOY_SERVER.md`

### 发布
```powershell
./scripts/deploy-server.ps1 `
  -ServerHost 172.16.10.165 `
  -User root `
  -Password cacp_123456
```

默认行为：
- 本地自动打包当前仓库
- 上传到服务器
- 在服务器上创建备份
- 覆盖 `/mnt/ai-workspace/exam`
- 执行 `docker-compose --env-file .env up -d --build backend frontend`

### 回滚
```powershell
./scripts/rollback-server.ps1 `
  -ServerHost 172.16.10.165 `
  -User root `
  -Password cacp_123456
```

默认会回滚到服务器备份目录中的最新备份。也可以指定具体备份名：
```powershell
./scripts/rollback-server.ps1 `
  -ServerHost 172.16.10.165 `
  -User root `
  -Password cacp_123456 `
  -Backup exam-20260415-120000.tar.gz
```

### 健康检查
```powershell
./scripts/health-check-server.ps1 `
  -ServerHost 172.16.10.165 `
  -User root `
  -Password cacp_123456
```

会检查：
- `exam_mysql` / `exam_backend` / `exam_frontend` 容器状态
- 前端首页是否可访问
- 管理员登录与工作台接口
- 学生登录与考试列表接口

### 数据库备份
```powershell
./scripts/backup-db-server.ps1 `
  -ServerHost 172.16.10.165 `
  -User root `
  -Password cacp_123456
```

默认会把备份保存到：
- `/mnt/ai-workspace/exam_releases/db_backups`

### 清理历史发布产物（默认 dry-run）
```powershell
./scripts/cleanup-server.ps1 `
  -ServerHost 172.16.10.165 `
  -User root `
  -Password cacp_123456
```

默认清理策略（保留最新）：
- 发布备份 `backups`：10 个
- 发布/回滚日志 `logs`：20 个
- 发布包上传 `uploads`：10 个
- 数据库备份 `db_backups`：10 个

只预览删除目标（dry-run）时，不会真正删除文件。  
确认输出安全后，再加 `-Apply` 执行实际删除：
```powershell
./scripts/cleanup-server.ps1 `
  -ServerHost 172.16.10.165 `
  -User root `
  -Password cacp_123456 `
  -Apply
```

### 线上回归测试
```powershell
./scripts/e2e-regression-server.ps1 `
  -ServerHost 172.16.10.165 `
  -User root `
  -Password cacp_123456
```

会验证：
- 管理员登录
- 新建题库
- 新建试题
- 新建并发布考试
- 学生开考、作答、提交
- 管理员成绩单
- 低权限账号接口拒绝

回归脚本会复用固定数据：
- `E2E Regression Repo`
- `E2E Regression Exam`

每次运行前会清理学生在这套回归考试上的旧作答记录，避免重复新增题库和考试。

### 日志与备份目录
- 发布备份：`/mnt/ai-workspace/exam_releases/backups`
- 发布包上传：`/mnt/ai-workspace/exam_releases/uploads`
- 发布/回滚日志：`/mnt/ai-workspace/exam_releases/logs`
- 数据库备份：`/mnt/ai-workspace/exam_releases/db_backups`

## 说明
- 后端已切换为 Prisma migration + seed 流程。
- 首个 migration 位于 `backend/prisma/migrations/20260414_init`。
- Docker 启动时会自动执行 `prisma migrate deploy` 和种子初始化。

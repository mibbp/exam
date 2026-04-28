import { App as AntApp, Button, Card, Col, Empty, List, Row, Skeleton, Statistic, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatedItem, MotionButtonShell, PageMotion } from '../../components/PageMotion';
import { useAuth } from '../../app/useAuth';
import { getDashboardOverview } from '../../services/dashboard';
import type { DashboardOverview } from '../../types';

const shortcutPermissionMap: Record<string, string> = {
  'new-exam': 'exams.create',
  'import-questions': 'questions.import',
  roles: 'roles.view',
  users: 'users.view',
};

export function AdminDashboardPage() {
  const { message } = AntApp.useApp();
  const auth = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        setData(await getDashboardOverview());
      } catch {
        message.error('加载工作台失败');
      } finally {
        setLoading(false);
      }
    })();
  }, [message]);

  const visibleShortcuts = useMemo(() => {
    const permissions = auth.user?.permissions ?? [];
    return (data?.shortcuts ?? []).filter((shortcut) => permissions.includes(shortcutPermissionMap[shortcut.key] ?? '__missing__'));
  }, [auth.user?.permissions, data?.shortcuts]);

  if (loading) {
    return <Skeleton active paragraph={{ rows: 12 }} />;
  }

  if (!data) {
    return <Empty description="暂无工作台数据" />;
  }

  return (
    <PageMotion className="stack-gap">
      <AnimatedItem className="native-card workspace-hero-card dashboard-hero" as="section">
        <div>
          <p className="eyebrow">Control Center</p>
          <Typography.Title level={2} className="workspace-hero-title">考试运营工作台</Typography.Title>
          <Typography.Paragraph className="workspace-hero-copy">
            聚合考试、题库、用户与权限信息，用更轻的界面完成发布、巡检和回归验证。
          </Typography.Paragraph>
        </div>
        <div className="workspace-hero-meta">
          <span className="chip chip-success">系统在线</span>
          <span className="chip">已发布 {data.stats.publishedExamCount}</span>
          <span className="chip">题库 {data.stats.repositoryCount}</span>
          <span className="chip">用户 {data.stats.userCount}</span>
        </div>
      </AnimatedItem>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={8}><AnimatedItem as="div"><Card className="glass-stat-card"><Statistic title="考试总数" value={data.stats.examCount} /></Card></AnimatedItem></Col>
        <Col xs={24} sm={12} xl={8}><AnimatedItem as="div"><Card className="glass-stat-card"><Statistic title="已发布考试" value={data.stats.publishedExamCount} /></Card></AnimatedItem></Col>
        <Col xs={24} sm={12} xl={8}><AnimatedItem as="div"><Card className="glass-stat-card"><Statistic title="进行中考试" value={data.stats.ongoingExamCount} /></Card></AnimatedItem></Col>
        <Col xs={24} sm={12} xl={8}><AnimatedItem as="div"><Card className="glass-stat-card"><Statistic title="题库数量" value={data.stats.repositoryCount} /></Card></AnimatedItem></Col>
        <Col xs={24} sm={12} xl={8}><AnimatedItem as="div"><Card className="glass-stat-card"><Statistic title="试题总数" value={data.stats.questionCount} /></Card></AnimatedItem></Col>
        <Col xs={24} sm={12} xl={8}><AnimatedItem as="div"><Card className="glass-stat-card"><Statistic title="用户总数" value={data.stats.userCount} /></Card></AnimatedItem></Col>
      </Row>

      <AnimatedItem as="div">
        <Card title="快捷入口" className="glass-list-card">
          {visibleShortcuts.length === 0 ? (
            <Empty description="当前账号没有快捷操作权限" />
          ) : (
            <Row gutter={[12, 12]}>
              {visibleShortcuts.map((shortcut) => (
                <Col key={shortcut.key} xs={24} md={12} xl={6}>
                  <MotionButtonShell>
                    <Button block size="large" className="quick-action modern-action-btn" onClick={() => navigate(shortcut.path)}>
                      {shortcut.title}
                    </Button>
                  </MotionButtonShell>
                </Col>
              ))}
            </Row>
          )}
        </Card>
      </AnimatedItem>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <AnimatedItem as="div">
            <Card title="最近考试" className="glass-list-card">
              <List
                dataSource={data.recentExams}
                renderItem={(exam) => (
                  <List.Item>
                    <List.Item.Meta
                      title={exam.title}
                      description={`状态：${exam.status} · 时长 ${exam.durationMinutes} 分钟 · 及格分 ${exam.passScore}`}
                    />
                    <Typography.Text type="secondary">{exam._count?.attempts ?? 0} 人次</Typography.Text>
                  </List.Item>
                )}
              />
            </Card>
          </AnimatedItem>
        </Col>
        <Col xs={24} xl={10}>
          <AnimatedItem as="div">
            <Card title="最新题库" className="glass-list-card">
              <List
                dataSource={data.recentRepositories}
                renderItem={(repository) => (
                  <List.Item>
                    <List.Item.Meta
                      title={repository.name}
                      description={`分类：${repository.category || '未分类'} · 试题 ${repository._count?.questions ?? 0} 道`}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </AnimatedItem>
        </Col>
      </Row>
    </PageMotion>
  );
}

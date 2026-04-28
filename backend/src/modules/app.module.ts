import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { QuestionsModule } from './questions/questions.module';
import { ExamsModule } from './exams/exams.module';
import { AttemptsModule } from './attempts/attempts.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { UsersModule } from './users/users.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { RepositoriesModule } from './repositories/repositories.module';
import { RolesModule } from './roles/roles.module';
import { RejoinRequestsModule } from './rejoin-requests/rejoin-requests.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    QuestionsModule,
    ExamsModule,
    AttemptsModule,
    AnalyticsModule,
    UsersModule,
    DashboardModule,
    RepositoriesModule,
    RolesModule,
    RejoinRequestsModule,
  ],
})
export class AppModule {}

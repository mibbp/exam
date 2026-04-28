import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import type { JwtUser } from './decorators/current-user.decorator';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private async getUserAuthPayload(userId: number): Promise<JwtUser & { status: 'ACTIVE' | 'DISABLED' }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roleAssignments: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const roles = user.roleAssignments.map((assignment) => assignment.role.code);
    const roleIds = user.roleAssignments.map((assignment) => assignment.role.id);
    const permissions = Array.from(
      new Set(
        user.roleAssignments.flatMap((assignment) =>
          assignment.role.permissions.map((item) => item.permission.code),
        ),
      ),
    );

    return {
      sub: user.id,
      username: user.username,
      displayName: user.displayName ?? undefined,
      role: user.role,
      roles,
      roleIds,
      permissions,
      status: user.status,
    };
  }

  private async signTokens(payload: JwtUser) {
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET ?? 'access-secret',
      expiresIn: '45m',
    });

    const refreshToken = await this.jwtService.signAsync(
      { ...payload, type: 'refresh' },
      {
        secret: process.env.JWT_REFRESH_SECRET ?? 'refresh-secret',
        expiresIn: '7d',
      },
    );

    return { accessToken, refreshToken };
  }

  async login(username: string, password: string, userAgent?: string, ip?: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.status === 'DISABLED') {
      throw new UnauthorizedException('User disabled');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = await this.getUserAuthPayload(user.id);
    const { accessToken, refreshToken } = await this.signTokens(payload);
    const refreshHash = await bcrypt.hash(refreshToken, 10);

    await this.prisma.refreshSession.create({
      data: {
        userId: user.id,
        tokenHash: refreshHash,
        userAgent,
        ipAddress: ip,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    return {
      accessToken,
      refreshToken,
      user: {
        id: payload.sub,
        username: payload.username,
        displayName: payload.displayName,
        role: payload.role,
        status: payload.status,
        roles: payload.roles,
        roleIds: payload.roleIds,
        permissions: payload.permissions,
      },
    };
  }

  async refresh(oldRefreshToken: string, userAgent?: string, ip?: string) {
    const payload = await this.jwtService
      .verifyAsync<JwtUser & { type: string }>(oldRefreshToken, {
        secret: process.env.JWT_REFRESH_SECRET ?? 'refresh-secret',
      })
      .catch(() => null);

    if (!payload || payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const sessions = await this.prisma.refreshSession.findMany({
      where: {
        userId: payload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    let currentSessionId: number | null = null;
    for (const session of sessions) {
      const matched = await bcrypt.compare(oldRefreshToken, session.tokenHash);
      if (matched) {
        currentSessionId = session.id;
        break;
      }
    }

    if (!currentSessionId) {
      throw new ForbiddenException('Refresh session not found');
    }

    await this.prisma.refreshSession.update({ where: { id: currentSessionId }, data: { revokedAt: new Date() } });

    const freshPayload = await this.getUserAuthPayload(payload.sub);
    const { accessToken, refreshToken } = await this.signTokens(freshPayload);
    const refreshHash = await bcrypt.hash(refreshToken, 10);

    await this.prisma.refreshSession.create({
      data: {
        userId: payload.sub,
        tokenHash: refreshHash,
        userAgent,
        ipAddress: ip,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: freshPayload.sub,
        username: freshPayload.username,
        displayName: freshPayload.displayName,
        role: freshPayload.role,
        status: freshPayload.status,
        roles: freshPayload.roles,
        roleIds: freshPayload.roleIds,
        permissions: freshPayload.permissions,
      },
    };
  }

  async logout(refreshToken: string) {
    const sessions = await this.prisma.refreshSession.findMany({
      where: { revokedAt: null, expiresAt: { gt: new Date() } },
    });
    for (const session of sessions) {
      const matched = await bcrypt.compare(refreshToken, session.tokenHash);
      if (matched) {
        await this.prisma.refreshSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
        break;
      }
    }
    return { ok: true };
  }
}

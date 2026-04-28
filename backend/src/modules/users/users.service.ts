import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ListUsersDto } from './dto/list-users.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private mapUser(user: {
    id: number;
    username: string;
    displayName: string | null;
    role: 'ADMIN' | 'STUDENT';
    status: 'ACTIVE' | 'DISABLED';
    lastLoginAt: Date | null;
    createdAt: Date;
    roleAssignments: Array<{ role: { id: number; code: string; name: string } }>;
  }) {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      roles: user.roleAssignments.map((assignment) => assignment.role),
    };
  }

  async list(query: ListUsersDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 20, 100);
    const where = {
      ...(query.keyword
        ? {
            OR: [
              { username: { contains: query.keyword } },
              { displayName: { contains: query.keyword } },
            ],
          }
        : {}),
      ...(query.role ? { role: query.role } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          roleAssignments: { include: { role: true } },
        },
      }),
    ]);

    return {
      total,
      page,
      pageSize,
      rows: rows.map((user) => this.mapUser(user)),
    };
  }

  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (exists) {
      throw new BadRequestException('Username already exists');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        displayName: dto.displayName,
        passwordHash,
        role: dto.role,
        status: dto.status ?? 'ACTIVE',
      },
    });
    await this.updateRoles(user.id, dto.roleIds ?? []);
    const current = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { roleAssignments: { include: { role: true } } },
    });
    return this.mapUser(current);
  }

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.displayName !== undefined ? { displayName: dto.displayName } : {}),
        ...(dto.role ? { role: dto.role } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
      include: { roleAssignments: { include: { role: true } } },
    });

    return this.mapUser(updated);
  }

  async updateRoles(id: number, roleIds: number[]) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    await this.prisma.userRoleAssignment.deleteMany({ where: { userId: id } });
    if (roleIds.length > 0) {
      await this.prisma.userRoleAssignment.createMany({
        data: roleIds.map((roleId) => ({ userId: id, roleId })),
        skipDuplicates: true,
      });
    }
    const current = await this.prisma.user.findUniqueOrThrow({
      where: { id },
      include: { roleAssignments: { include: { role: true } } },
    });
    return this.mapUser(current);
  }

  async resetPassword(id: number, dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    return { ok: true };
  }
}

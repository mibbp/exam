import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.role.findMany({
      orderBy: [{ isSystem: 'desc' }, { id: 'asc' }],
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { userAssignments: true } },
      },
    });
  }

  permissions() {
    return this.prisma.permission.findMany({ orderBy: [{ category: 'asc' }, { id: 'asc' }] });
  }

  async create(dto: CreateRoleDto) {
    const role = await this.prisma.role.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
      },
    });
    await this.updatePermissions(role.id, dto.permissionCodes ?? []);
    return this.prisma.role.findUnique({
      where: { id: role.id },
      include: { permissions: { include: { permission: true } } },
    });
  }

  async update(id: number, dto: UpdateRoleDto) {
    const role = await this.prisma.role.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
      },
    });
    if (dto.permissionCodes) {
      await this.updatePermissions(id, dto.permissionCodes);
    }
    return role;
  }

  async updatePermissions(id: number, permissionCodes: string[]) {
    const permissions = await this.prisma.permission.findMany({ where: { code: { in: permissionCodes } } });
    await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
    if (permissions.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: permissions.map((permission) => ({ roleId: id, permissionId: permission.id })),
        skipDuplicates: true,
      });
    }
    return this.prisma.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } } },
    });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRepositoryDto } from './dto/create-repository.dto';
import { ListRepositoriesDto } from './dto/list-repositories.dto';
import { UpdateRepositoryDto } from './dto/update-repository.dto';

@Injectable()
export class RepositoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListRepositoriesDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 20, 100);
    const where = {
      ...(query.keyword ? { name: { contains: query.keyword } } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.questionRepository.count({ where }),
      this.prisma.questionRepository.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { questions: true } } },
      }),
    ]);
    return { total, page, pageSize, rows };
  }

  create(dto: CreateRepositoryDto) {
    return this.prisma.questionRepository.create({
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        status: dto.status ?? 'ACTIVE',
      },
    });
  }

  update(id: number, dto: UpdateRepositoryDto) {
    return this.prisma.questionRepository.update({
      where: { id },
      data: dto,
    });
  }
}

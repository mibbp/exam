import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { RepositoriesService } from './repositories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { ListRepositoriesDto } from './dto/list-repositories.dto';
import { CreateRepositoryDto } from './dto/create-repository.dto';
import { UpdateRepositoryDto } from './dto/update-repository.dto';

@Controller('question-repositories')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN')
export class RepositoriesController {
  constructor(private readonly repositoriesService: RepositoriesService) {}

  @Get()
  @Permissions('repositories.view')
  list(@Query() query: ListRepositoriesDto) {
    return this.repositoriesService.list(query);
  }

  @Post()
  @Permissions('repositories.create')
  create(@Body() dto: CreateRepositoryDto) {
    return this.repositoriesService.create(dto);
  }

  @Patch(':id')
  @Permissions('repositories.update')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRepositoryDto) {
    return this.repositoriesService.update(id, dto);
  }
}

import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum ExamStatusDto {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CLOSED = 'CLOSED',
}

export enum OpenTypeQueryDto {
  PUBLIC = 'PUBLIC',
  USERS = 'USERS',
  ROLES = 'ROLES',
}

export class ListExamsDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsEnum(ExamStatusDto)
  status?: ExamStatusDto;

  @IsOptional()
  @IsEnum(OpenTypeQueryDto)
  openType?: OpenTypeQueryDto;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  pageSize?: number;
}

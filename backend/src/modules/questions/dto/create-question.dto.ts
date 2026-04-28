import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum QuestionTypeDto {
  SINGLE = 'SINGLE',
  MULTIPLE = 'MULTIPLE',
  TRUE_FALSE = 'TRUE_FALSE',
}

export enum QuestionStatusDto {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
}

export class CreateQuestionDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  repositoryId?: number;

  @IsEnum(QuestionTypeDto)
  type!: QuestionTypeDto;

  @IsString()
  content!: string;

  @IsArray()
  options!: string[];

  @IsString()
  answer!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  score!: number;

  @IsOptional()
  @IsString()
  analysis?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  difficulty?: number;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsArray()
  knowledgePoints?: string[];

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsEnum(QuestionStatusDto)
  status?: QuestionStatusDto;
}

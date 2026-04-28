import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export enum OpenTypeDto {
  PUBLIC = 'PUBLIC',
  USERS = 'USERS',
  ROLES = 'ROLES',
}

export enum ShowResultModeDto {
  IMMEDIATE = 'IMMEDIATE',
  AFTER_SUBMIT = 'AFTER_SUBMIT',
  MANUAL = 'MANUAL',
}

export class ExamQuestionConfigDto {
  @Type(() => Number)
  @IsInt()
  questionId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  score!: number;
}

export class CreateExamDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMinutes!: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  passScore?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttempts?: number;

  @IsOptional()
  @IsString()
  startsAt?: string;

  @IsOptional()
  @IsString()
  endsAt?: string;

  @IsOptional()
  @IsEnum(OpenTypeDto)
  openType?: OpenTypeDto;

  @IsOptional()
  @IsArray()
  allowedUserIds?: number[];

  @IsOptional()
  @IsArray()
  allowedRoleIds?: number[];

  @IsOptional()
  @IsBoolean()
  allowReview?: boolean;

  @IsOptional()
  @IsBoolean()
  shuffleQuestions?: boolean;

  @IsOptional()
  @IsBoolean()
  shuffleOptions?: boolean;

  @IsOptional()
  @IsBoolean()
  antiCheatEnabled?: boolean;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  antiCheatThreshold?: number;

  @IsOptional()
  @IsEnum(ShowResultModeDto)
  showResultMode?: ShowResultModeDto;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ExamQuestionConfigDto)
  questionConfigs!: ExamQuestionConfigDto[];
}

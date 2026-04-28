import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewRejoinRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reviewNote?: string;
}


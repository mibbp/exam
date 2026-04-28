import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRejoinRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}


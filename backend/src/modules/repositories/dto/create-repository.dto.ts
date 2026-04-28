import { IsEnum, IsOptional, IsString } from 'class-validator';
import { RepositoryStatusDto } from './list-repositories.dto';

export class CreateRepositoryDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(RepositoryStatusDto)
  status?: RepositoryStatusDto;
}

import { IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRoleDto, UserStatusDto } from './create-user.dto';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsEnum(UserRoleDto)
  role?: UserRoleDto;

  @IsOptional()
  @IsEnum(UserStatusDto)
  status?: UserStatusDto;
}

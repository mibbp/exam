import { IsArray, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export enum UserRoleDto {
  ADMIN = 'ADMIN',
  STUDENT = 'STUDENT',
}

export enum UserStatusDto {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
}

export class CreateUserDto {
  @IsString()
  username!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsEnum(UserRoleDto)
  role!: UserRoleDto;

  @IsOptional()
  @IsEnum(UserStatusDto)
  status?: UserStatusDto;

  @IsOptional()
  @IsArray()
  roleIds?: number[];
}

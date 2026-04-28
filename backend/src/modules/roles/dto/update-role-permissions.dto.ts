import { IsArray } from 'class-validator';

export class UpdateRolePermissionsDto {
  @IsArray()
  permissionCodes!: string[];
}

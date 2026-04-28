import { IsArray } from 'class-validator';

export class UpdateUserRolesDto {
  @IsArray()
  roleIds!: number[];
}

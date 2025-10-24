import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WorkspaceMemberRole } from '../schemas/workspace.schema';

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: WorkspaceMemberRole })
  @IsEnum(WorkspaceMemberRole)
  role: WorkspaceMemberRole;
}

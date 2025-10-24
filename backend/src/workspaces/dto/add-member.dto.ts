import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkspaceMemberRole } from '../schemas/workspace.schema';

export class AddMemberDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiPropertyOptional({ enum: WorkspaceMemberRole, default: WorkspaceMemberRole.MEMBER })
  @IsOptional()
  @IsEnum(WorkspaceMemberRole)
  role?: WorkspaceMemberRole;
}

import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '../schemas/user.schema';

export class UpdateStatusDto {
  @ApiProperty({ enum: UserStatus })
  @IsEnum(UserStatus)
  status: UserStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  statusMessage?: string;
}

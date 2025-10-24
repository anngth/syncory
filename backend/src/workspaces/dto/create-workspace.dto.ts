import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWorkspaceDto {
  @ApiProperty({ example: 'My Workspace' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'A workspace for my team' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logo?: string;
}

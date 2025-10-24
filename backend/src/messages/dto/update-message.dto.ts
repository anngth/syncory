import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMessageDto {
  @ApiProperty({ example: 'Updated message content' })
  @IsString()
  @MinLength(1)
  content: string;
}

import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  async getProfile(@CurrentUser('userId') userId: string) {
    const user = await this.usersService.findById(userId);
    return this.usersService.sanitizeUser(user);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search users' })
  @ApiResponse({ status: 200, description: 'Users found' })
  async searchUsers(@Query('q') query: string, @Query('limit') limit?: number) {
    const users = await this.usersService.searchUsers(query, limit);
    return Promise.all(users.map((user) => this.usersService.sanitizeUser(user)));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    return this.usersService.sanitizeUser(user);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'User profile updated' })
  async updateProfile(
    @CurrentUser('userId') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const user = await this.usersService.update(userId, updateUserDto);
    return this.usersService.sanitizeUser(user);
  }

  @Put('me/status')
  @ApiOperation({ summary: 'Update user status' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateStatus(
    @CurrentUser('userId') userId: string,
    @Body() updateStatusDto: UpdateStatusDto,
  ) {
    const user = await this.usersService.updateStatus(userId, updateStatusDto);
    return this.usersService.sanitizeUser(user);
  }

  @Delete('me')
  @ApiOperation({ summary: 'Delete current user account' })
  @ApiResponse({ status: 200, description: 'User deleted' })
  async deleteAccount(@CurrentUser('userId') userId: string) {
    await this.usersService.delete(userId);
    return { message: 'Account deleted successfully' };
  }
}

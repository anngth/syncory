import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Workspaces')
@Controller('workspaces')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class WorkspacesController {
  constructor(private workspacesService: WorkspacesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new workspace' })
  @ApiResponse({ status: 201, description: 'Workspace created' })
  async create(
    @Body() createWorkspaceDto: CreateWorkspaceDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.workspacesService.create(createWorkspaceDto, userId);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get current user workspaces' })
  @ApiResponse({ status: 200, description: 'Workspaces retrieved' })
  async getUserWorkspaces(@CurrentUser('userId') userId: string) {
    return this.workspacesService.findUserWorkspaces(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workspace by ID' })
  @ApiResponse({ status: 200, description: 'Workspace found' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async getById(@Param('id') id: string) {
    return this.workspacesService.findById(id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get workspace by slug' })
  @ApiResponse({ status: 200, description: 'Workspace found' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async getBySlug(@Param('slug') slug: string) {
    return this.workspacesService.findBySlug(slug);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update workspace' })
  @ApiResponse({ status: 200, description: 'Workspace updated' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async update(
    @Param('id') id: string,
    @Body() updateWorkspaceDto: UpdateWorkspaceDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.workspacesService.update(id, updateWorkspaceDto, userId);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add member to workspace' })
  @ApiResponse({ status: 200, description: 'Member added' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async addMember(
    @Param('id') id: string,
    @Body() addMemberDto: AddMemberDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.workspacesService.addMember(id, addMemberDto, userId);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove member from workspace' })
  @ApiResponse({ status: 200, description: 'Member removed' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async removeMember(
    @Param('id') id: string,
    @Param('userId') memberId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.workspacesService.removeMember(id, memberId, userId);
  }

  @Put(':id/members/:userId/role')
  @ApiOperation({ summary: 'Update member role' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async updateMemberRole(
    @Param('id') id: string,
    @Param('userId') memberId: string,
    @Body() updateRoleDto: UpdateMemberRoleDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.workspacesService.updateMemberRole(id, memberId, updateRoleDto.role, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete workspace' })
  @ApiResponse({ status: 200, description: 'Workspace deleted' })
  @ApiResponse({ status: 403, description: 'Only owner can delete' })
  async delete(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    await this.workspacesService.delete(id, userId);
    return { message: 'Workspace deleted successfully' };
  }
}

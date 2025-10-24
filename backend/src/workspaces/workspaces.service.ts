import { Injectable, Logger, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Workspace, WorkspaceMemberRole } from './schemas/workspace.schema';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { CacheService } from '../common/services/cache.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class WorkspacesService {
  private readonly logger = new Logger(WorkspacesService.name);

  constructor(
    @InjectModel(Workspace.name) private workspaceModel: Model<Workspace>,
    private cacheService: CacheService,
    private usersService: UsersService,
  ) {}

  async create(createWorkspaceDto: CreateWorkspaceDto, userId: string): Promise<Workspace> {
    // Generate unique slug
    const slug = await this.generateUniqueSlug(createWorkspaceDto.name);

    const workspace = new this.workspaceModel({
      ...createWorkspaceDto,
      slug,
      ownerId: new Types.ObjectId(userId),
      members: [
        {
          userId: new Types.ObjectId(userId),
          role: WorkspaceMemberRole.OWNER,
          joinedAt: new Date(),
        },
      ],
    });

    await workspace.save();

    // Add workspace to user's workspaces
    await this.usersService.addWorkspace(userId, workspace._id.toString());

    // Cache workspace
    await this.cacheWorkspace(workspace);

    this.logger.log(`Workspace created: ${workspace.name} by user ${userId}`);
    return workspace;
  }

  async findById(id: string): Promise<Workspace> {
    // Try cache first
    const cacheKey = this.cacheService.getWorkspaceKey(id);
    const cached = await this.cacheService.get<Workspace>(cacheKey);
    if (cached) return cached;

    const workspace = await this.workspaceModel.findById(id).populate('members.userId', '-password').exec();
    
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    await this.cacheWorkspace(workspace);
    return workspace;
  }

  async findBySlug(slug: string): Promise<Workspace> {
    const workspace = await this.workspaceModel.findOne({ slug }).populate('members.userId', '-password').exec();
    
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    await this.cacheWorkspace(workspace);
    return workspace;
  }

  async findUserWorkspaces(userId: string): Promise<Workspace[]> {
    // Try cache first
    const cacheKey = this.cacheService.getUserWorkspacesKey(userId);
    const cached = await this.cacheService.get<Workspace[]>(cacheKey);
    if (cached) return cached;

    const workspaces = await this.workspaceModel
      .find({
        'members.userId': new Types.ObjectId(userId),
        isActive: true,
      })
      .populate('members.userId', '-password')
      .sort({ createdAt: -1 })
      .exec();

    // Cache result
    await this.cacheService.set(cacheKey, workspaces, 1800); // 30 minutes

    return workspaces;
  }

  async update(id: string, updateWorkspaceDto: UpdateWorkspaceDto, userId: string): Promise<Workspace> {
    const workspace = await this.findById(id);

    // Check permissions
    if (!this.isOwnerOrAdmin(workspace, userId)) {
      throw new ForbiddenException('Only workspace owners and admins can update workspace');
    }

    // Update slug if name changed
    if (updateWorkspaceDto.name && updateWorkspaceDto.name !== workspace.name) {
      updateWorkspaceDto['slug'] = await this.generateUniqueSlug(updateWorkspaceDto.name);
    }

    const updatedWorkspace = await this.workspaceModel
      .findByIdAndUpdate(id, { $set: updateWorkspaceDto }, { new: true })
      .populate('members.userId', '-password')
      .exec();

    // Update cache
    await this.cacheWorkspace(updatedWorkspace);
    await this.invalidateUserWorkspacesCache(userId);

    this.logger.log(`Workspace updated: ${id} by user ${userId}`);
    return updatedWorkspace;
  }

  async addMember(workspaceId: string, addMemberDto: AddMemberDto, requestUserId: string): Promise<Workspace> {
    const workspace = await this.findById(workspaceId);

    // Check permissions
    if (!this.isOwnerOrAdmin(workspace, requestUserId)) {
      throw new ForbiddenException('Only workspace owners and admins can add members');
    }

    // Check if user already a member
    const isMember = workspace.members.some(
      (m) => m.userId.toString() === addMemberDto.userId,
    );

    if (isMember) {
      throw new ConflictException('User is already a member');
    }

    // Add member
    workspace.members.push({
      userId: new Types.ObjectId(addMemberDto.userId),
      role: addMemberDto.role || WorkspaceMemberRole.MEMBER,
      joinedAt: new Date(),
    });

    await workspace.save();

    // Add workspace to user's workspaces
    await this.usersService.addWorkspace(addMemberDto.userId, workspaceId);

    // Update cache
    await this.cacheWorkspace(workspace);
    await this.invalidateUserWorkspacesCache(addMemberDto.userId);

    this.logger.log(`Member added to workspace ${workspaceId}: ${addMemberDto.userId}`);
    return workspace;
  }

  async removeMember(workspaceId: string, userId: string, requestUserId: string): Promise<Workspace> {
    const workspace = await this.findById(workspaceId);

    // Check if user is owner
    if (workspace.ownerId.toString() === userId) {
      throw new ForbiddenException('Cannot remove workspace owner');
    }

    // Check permissions
    if (!this.isOwnerOrAdmin(workspace, requestUserId) && requestUserId !== userId) {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Remove member
    workspace.members = workspace.members.filter(
      (m) => m.userId.toString() !== userId,
    );

    await workspace.save();

    // Remove workspace from user's workspaces
    await this.usersService.removeWorkspace(userId, workspaceId);

    // Update cache
    await this.cacheWorkspace(workspace);
    await this.invalidateUserWorkspacesCache(userId);

    this.logger.log(`Member removed from workspace ${workspaceId}: ${userId}`);
    return workspace;
  }

  async updateMemberRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceMemberRole,
    requestUserId: string,
  ): Promise<Workspace> {
    const workspace = await this.findById(workspaceId);

    // Only owner can change roles
    if (workspace.ownerId.toString() !== requestUserId) {
      throw new ForbiddenException('Only workspace owner can change member roles');
    }

    const member = workspace.members.find((m) => m.userId.toString() === userId);
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    member.role = role;
    await workspace.save();

    await this.cacheWorkspace(workspace);

    this.logger.log(`Member role updated in workspace ${workspaceId}: ${userId} -> ${role}`);
    return workspace;
  }

  async delete(id: string, userId: string): Promise<void> {
    const workspace = await this.findById(id);

    // Only owner can delete
    if (workspace.ownerId.toString() !== userId) {
      throw new ForbiddenException('Only workspace owner can delete workspace');
    }

    await this.workspaceModel.findByIdAndDelete(id).exec();

    // Remove from all members' workspaces
    for (const member of workspace.members) {
      await this.usersService.removeWorkspace(member.userId.toString(), id);
      await this.invalidateUserWorkspacesCache(member.userId.toString());
    }

    // Clear cache
    await this.cacheService.delete(this.cacheService.getWorkspaceKey(id));

    this.logger.log(`Workspace deleted: ${id} by user ${userId}`);
  }

  // Helper methods
  private async generateUniqueSlug(name: string): Promise<string> {
    let slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    let uniqueSlug = slug;
    let counter = 1;

    while (await this.workspaceModel.findOne({ slug: uniqueSlug })) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    return uniqueSlug;
  }

  private isOwnerOrAdmin(workspace: Workspace, userId: string): boolean {
    if (workspace.ownerId.toString() === userId) return true;

    const member = workspace.members.find((m) => m.userId.toString() === userId);
    return member?.role === WorkspaceMemberRole.ADMIN;
  }

  private async cacheWorkspace(workspace: Workspace): Promise<void> {
    const cacheKey = this.cacheService.getWorkspaceKey(workspace._id.toString());
    await this.cacheService.set(cacheKey, workspace, 3600); // 1 hour
  }

  private async invalidateUserWorkspacesCache(userId: string): Promise<void> {
    await this.cacheService.delete(this.cacheService.getUserWorkspacesKey(userId));
  }

  isMember(workspace: Workspace, userId: string): boolean {
    return workspace.members.some((m) => m.userId.toString() === userId);
  }
}

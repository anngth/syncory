import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserStatus } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { CacheService } from '../common/services/cache.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private cacheService: CacheService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = new this.userModel(createUserDto);
    await user.save();
    
    // Cache user
    await this.cacheUser(user);
    
    this.logger.log(`User created: ${user.email}`);
    return user;
  }

  async findById(id: string): Promise<User | null> {
    // Try cache first
    const cacheKey = this.cacheService.getUserKey(id);
    const cached = await this.cacheService.get<User>(cacheKey);
    if (cached) return cached;

    const user = await this.userModel.findById(id).exec();
    if (user) {
      await this.cacheUser(user);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findByUsername(username: string): Promise<User | null> {
    return await this.userModel.findOne({ username }).exec();
  }

  async findByIds(ids: string[]): Promise<User[]> {
    return await this.userModel.find({ _id: { $in: ids } }).exec();
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(id, { $set: updateUserDto }, { new: true })
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update cache
    await this.cacheUser(user);
    
    this.logger.log(`User updated: ${id}`);
    return user;
  }

  async updateStatus(id: string, updateStatusDto: UpdateStatusDto): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            status: updateStatusDto.status,
            statusMessage: updateStatusDto.statusMessage,
          },
        },
        { new: true },
      )
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update cache
    await this.cacheUser(user);

    return user;
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(id, { lastLogin: new Date() }).exec();
  }

  async addWorkspace(userId: string, workspaceId: string): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        { $addToSet: { workspaces: new Types.ObjectId(workspaceId) } },
        { new: true },
      )
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.cacheUser(user);
    await this.cacheService.delete(this.cacheService.getUserWorkspacesKey(userId));

    return user;
  }

  async removeWorkspace(userId: string, workspaceId: string): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        { $pull: { workspaces: new Types.ObjectId(workspaceId) } },
        { new: true },
      )
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.cacheUser(user);
    await this.cacheService.delete(this.cacheService.getUserWorkspacesKey(userId));

    return user;
  }

  async searchUsers(query: string, limit: number = 20): Promise<User[]> {
    return await this.userModel
      .find({
        $or: [
          { username: { $regex: query, $options: 'i' } },
          { fullName: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
        ],
        isActive: true,
      })
      .limit(limit)
      .select('-password')
      .exec();
  }

  async delete(id: string): Promise<void> {
    await this.userModel.findByIdAndDelete(id).exec();
    await this.cacheService.delete(this.cacheService.getUserKey(id));
    this.logger.log(`User deleted: ${id}`);
  }

  // Helper methods
  private async cacheUser(user: User): Promise<void> {
    const cacheKey = this.cacheService.getUserKey(user._id.toString());
    await this.cacheService.set(cacheKey, user, 3600); // 1 hour
  }

  async sanitizeUser(user: User): Promise<any> {
    const sanitized = user.toObject();
    delete sanitized.password;
    delete sanitized.passwordResetToken;
    delete sanitized.emailVerificationToken;
    return sanitized;
  }
}

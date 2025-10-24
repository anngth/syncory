import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum WorkspaceMemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  GUEST = 'guest',
}

export interface WorkspaceMember {
  userId: Types.ObjectId;
  role: WorkspaceMemberRole;
  joinedAt: Date;
}

@Schema({ timestamps: true })
export class Workspace extends Document {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ default: null })
  description: string;

  @Prop({ default: null })
  logo: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  ownerId: Types.ObjectId;

  @Prop({
    type: [
      {
        userId: { type: Types.ObjectId, ref: 'User' },
        role: { type: String, enum: WorkspaceMemberRole },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  members: WorkspaceMember[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Channel' }], default: [] })
  channels: Types.ObjectId[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Object, default: {} })
  settings: {
    allowInvites?: boolean;
    defaultChannelId?: string;
    inviteOnly?: boolean;
  };
}

export const WorkspaceSchema = SchemaFactory.createForClass(Workspace);

// Indexes
WorkspaceSchema.index({ slug: 1 });
WorkspaceSchema.index({ ownerId: 1 });
WorkspaceSchema.index({ 'members.userId': 1 });
WorkspaceSchema.index({ createdAt: -1 });

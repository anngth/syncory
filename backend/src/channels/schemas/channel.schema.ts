import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ChannelType {
  PUBLIC = 'public',
  PRIVATE = 'private',
  DIRECT = 'direct',
  GROUP = 'group',
}

export interface ChannelMember {
  userId: Types.ObjectId;
  joinedAt: Date;
  lastRead?: Date;
}

@Schema({ timestamps: true })
export class Channel extends Document {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: null })
  description: string;

  @Prop({ type: String, enum: ChannelType, default: ChannelType.PUBLIC })
  type: ChannelType;

  @Prop({ type: Types.ObjectId, ref: 'Workspace', required: true })
  workspaceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({
    type: [
      {
        userId: { type: Types.ObjectId, ref: 'User' },
        joinedAt: { type: Date, default: Date.now },
        lastRead: { type: Date, default: null },
      },
    ],
    default: [],
  })
  members: ChannelMember[];

  @Prop({ default: false })
  isArchived: boolean;

  @Prop({ default: null })
  topic: string;

  @Prop({ type: [String], default: [] })
  pinnedMessages: string[];

  @Prop({ type: Object, default: {} })
  settings: {
    notifications?: boolean;
    muteUntil?: Date;
  };
}

export const ChannelSchema = SchemaFactory.createForClass(Channel);

// Indexes
ChannelSchema.index({ workspaceId: 1 });
ChannelSchema.index({ type: 1 });
ChannelSchema.index({ 'members.userId': 1 });
ChannelSchema.index({ createdAt: -1 });
ChannelSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum MessageType {
  TEXT = 'text',
  FILE = 'file',
  IMAGE = 'image',
  SYSTEM = 'system',
}

export interface Reaction {
  emoji: string;
  userId: Types.ObjectId;
  createdAt: Date;
}

export interface Attachment {
  fileId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  thumbnailUrl?: string;
}

@Schema({ timestamps: true })
export class Message extends Document {
  @Prop({ required: true })
  content: string;

  @Prop({ type: String, enum: MessageType, default: MessageType.TEXT })
  type: MessageType;

  @Prop({ type: Types.ObjectId, ref: 'Channel', required: true })
  channelId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Workspace', required: true })
  workspaceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Message', default: null })
  parentId: Types.ObjectId | null;

  @Prop({ type: Number, default: 0 })
  threadCount: number;

  @Prop({
    type: [
      {
        emoji: String,
        userId: { type: Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  reactions: Reaction[];

  @Prop({
    type: [
      {
        fileId: String,
        fileName: String,
        fileUrl: String,
        fileType: String,
        fileSize: Number,
        thumbnailUrl: String,
      },
    ],
    default: [],
  })
  attachments: Attachment[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  mentions: Types.ObjectId[];

  @Prop({ default: false })
  isPinned: boolean;

  @Prop({ default: false })
  isEdited: boolean;

  @Prop({ default: null })
  editedAt: Date;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ default: null })
  deletedAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Indexes
MessageSchema.index({ channelId: 1, createdAt: -1 });
MessageSchema.index({ workspaceId: 1 });
MessageSchema.index({ senderId: 1 });
MessageSchema.index({ parentId: 1 });
MessageSchema.index({ content: 'text' }); // Full-text search
MessageSchema.index({ createdAt: -1 });

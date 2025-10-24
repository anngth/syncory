import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum UserStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  AWAY = 'away',
  DO_NOT_DISTURB = 'dnd',
}

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, unique: true, trim: true })
  username: string;

  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ default: null })
  avatar: string;

  @Prop({ default: null })
  bio: string;

  @Prop({ default: null })
  phone: string;

  @Prop({ default: null })
  timezone: string;

  @Prop({ type: String, enum: UserStatus, default: UserStatus.OFFLINE })
  status: UserStatus;

  @Prop({ default: null })
  statusMessage: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Workspace' }], default: [] })
  workspaces: Types.ObjectId[];

  @Prop({ default: Date.now })
  lastLogin: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ default: null })
  emailVerificationToken: string;

  @Prop({ default: null })
  passwordResetToken: string;

  @Prop({ default: null })
  passwordResetExpires: Date;

  @Prop({ type: Object, default: {} })
  preferences: {
    notifications?: {
      email?: boolean;
      push?: boolean;
      desktop?: boolean;
    };
    theme?: string;
    language?: string;
  };
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ workspaces: 1 });
UserSchema.index({ createdAt: -1 });

import { SetMetadata } from '@nestjs/common';

export enum Role {
  USER = 'user',
  ADMIN = 'admin',
  WORKSPACE_OWNER = 'workspace_owner',
  WORKSPACE_ADMIN = 'workspace_admin',
  CHANNEL_ADMIN = 'channel_admin',
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

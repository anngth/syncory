import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';
import { Workspace, WorkspaceSchema } from './schemas/workspace.schema';
import { UsersModule } from '../users/users.module';
import { ChannelsModule } from '../channels/channels.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Workspace.name, schema: WorkspaceSchema }]),
    UsersModule,
    ChannelsModule,
  ],
  controllers: [WorkspacesController],
  providers: [WorkspacesService],
  exports: [WorkspacesService, MongooseModule],
})
export class WorkspacesModule {}

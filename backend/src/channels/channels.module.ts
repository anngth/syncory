import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChannelsController } from './channels.controller';
import { ChannelsService } from './channels.service';
import { Channel, ChannelSchema } from './schemas/channel.schema';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Channel.name, schema: ChannelSchema }]),
    forwardRef(() => WorkspacesModule),
  ],
  controllers: [ChannelsController],
  providers: [ChannelsService],
  exports: [ChannelsService, MongooseModule],
})
export class ChannelsModule {}

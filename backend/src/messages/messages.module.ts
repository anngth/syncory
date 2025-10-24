import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { Message, MessageSchema } from './schemas/message.schema';
import { ChannelsModule } from '../channels/channels.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }]),
    ChannelsModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService, MongooseModule],
})
export class MessagesModule {}

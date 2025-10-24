import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChatGateway } from './chat.gateway';
import { PresenceGateway } from './presence.gateway';
import { TypingGateway } from './typing.gateway';
import { UsersModule } from '../users/users.module';
import { MessagesModule } from '../messages/messages.module';
import { ChannelsModule } from '../channels/channels.module';

@Module({
  imports: [
    UsersModule,
    MessagesModule,
    ChannelsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [ChatGateway, PresenceGateway, TypingGateway],
})
export class GatewayModule {}

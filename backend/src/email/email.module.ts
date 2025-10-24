import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { NodemailerService } from './services/nodemailer.service';
import { SendGridService } from './services/sendgrid.service';
import { EmailFactory } from './services/email.factory';

@Module({
  imports: [ConfigModule],
  providers: [EmailService, NodemailerService, SendGridService, EmailFactory],
  exports: [EmailService],
})
export class EmailModule {}

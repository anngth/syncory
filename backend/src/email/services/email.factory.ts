import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IEmailService } from '../interfaces/email.interface';
import { NodemailerService } from './nodemailer.service';
import { SendGridService } from './sendgrid.service';

@Injectable()
export class EmailFactory {
  private readonly logger = new Logger(EmailFactory.name);

  constructor(
    private configService: ConfigService,
    private nodemailerService: NodemailerService,
    private sendGridService: SendGridService,
  ) {}

  getEmailService(): IEmailService {
    const provider = this.configService.get<string>('EMAIL_PROVIDER', 'nodemailer');

    switch (provider) {
      case 'sendgrid':
        this.logger.log('Using SendGrid for emails');
        return this.sendGridService;
      case 'nodemailer':
      default:
        this.logger.log('Using Nodemailer for emails');
        return this.nodemailerService;
    }
  }
}

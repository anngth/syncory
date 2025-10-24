import { Injectable } from '@nestjs/common';
import { EmailFactory } from './services/email.factory';
import { EmailOptions } from './interfaces/email.interface';

@Injectable()
export class EmailService {
  constructor(private emailFactory: EmailFactory) {}

  async sendEmail(options: EmailOptions): Promise<void> {
    const emailService = this.emailFactory.getEmailService();
    return emailService.sendEmail(options);
  }

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    const emailService = this.emailFactory.getEmailService();
    return emailService.sendWelcomeEmail(to, name);
  }

  async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    const emailService = this.emailFactory.getEmailService();
    return emailService.sendPasswordResetEmail(to, resetToken);
  }

  async sendInviteEmail(to: string, workspaceName: string, inviteLink: string): Promise<void> {
    const emailService = this.emailFactory.getEmailService();
    return emailService.sendInviteEmail(to, workspaceName, inviteLink);
  }
}

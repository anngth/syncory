import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { IEmailService, EmailOptions } from '../interfaces/email.interface';

@Injectable()
export class NodemailerService implements IEmailService {
  private readonly logger = new Logger(NodemailerService.name);
  private transporter: nodemailer.Transporter;
  private readonly fromEmail: string;
  private readonly frontendUrl: string;

  constructor(private configService: ConfigService) {
    this.fromEmail = this.configService.get<string>('EMAIL_FROM', 'noreply@syncory.com');
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: this.configService.get<boolean>('SMTP_SECURE'),
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASSWORD'),
      },
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: options.from || this.fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      this.logger.log(`Email sent to ${options.to}: ${options.subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      throw error;
    }
  }

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    const subject = 'Welcome to Syncory!';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #611f69;">Welcome to Syncory!</h1>
        <p>Hi ${name},</p>
        <p>Thank you for signing up! We're excited to have you on board.</p>
        <p>Get started by creating your first workspace and inviting your team members.</p>
        <a href="${this.frontendUrl}" style="display: inline-block; padding: 12px 24px; background-color: #611f69; color: white; text-decoration: none; border-radius: 4px; margin-top: 16px;">
          Get Started
        </a>
        <p style="margin-top: 32px; color: #666;">
          Best regards,<br/>
          The Syncory Team
        </p>
      </div>
    `;

    await this.sendEmail({ to, subject, html });
  }

  async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    const resetLink = `${this.frontendUrl}/reset-password?token=${resetToken}`;
    const subject = 'Reset Your Password';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #611f69;">Reset Your Password</h1>
        <p>You requested to reset your password.</p>
        <p>Click the button below to reset your password. This link will expire in 1 hour.</p>
        <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #611f69; color: white; text-decoration: none; border-radius: 4px; margin-top: 16px;">
          Reset Password
        </a>
        <p style="margin-top: 32px; color: #666;">
          If you didn't request this, please ignore this email.
        </p>
        <p style="color: #666;">
          Best regards,<br/>
          The Syncory Team
        </p>
      </div>
    `;

    await this.sendEmail({ to, subject, html });
  }

  async sendInviteEmail(to: string, workspaceName: string, inviteLink: string): Promise<void> {
    const subject = `You've been invited to join ${workspaceName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #611f69;">You've Been Invited!</h1>
        <p>You've been invited to join <strong>${workspaceName}</strong> on Syncory.</p>
        <p>Click the button below to accept the invitation and get started.</p>
        <a href="${inviteLink}" style="display: inline-block; padding: 12px 24px; background-color: #611f69; color: white; text-decoration: none; border-radius: 4px; margin-top: 16px;">
          Accept Invitation
        </a>
        <p style="margin-top: 32px; color: #666;">
          Best regards,<br/>
          The Syncory Team
        </p>
      </div>
    `;

    await this.sendEmail({ to, subject, html });
  }
}

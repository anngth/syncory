export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

export interface IEmailService {
  sendEmail(options: EmailOptions): Promise<void>;
  sendWelcomeEmail(to: string, name: string): Promise<void>;
  sendPasswordResetEmail(to: string, resetToken: string): Promise<void>;
  sendInviteEmail(to: string, workspaceName: string, inviteLink: string): Promise<void>;
}

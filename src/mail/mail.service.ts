import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { User } from '../users/entities/user.entity';

@Injectable()
export class MailService {
  private readonly resend: Resend;
  private readonly logger = new Logger(MailService.name);
  private readonly fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
    this.fromAddress =
      this.configService.get<string>('MAIL_FROM') ??
      '"Telemedicine" <hello@likita24.com>';
  }

  async sendVerificationEmail(user: User, token: string) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const verificationLink = `${frontendUrl}/verify-email?token=${token}`;

    const { error } = await this.resend.emails.send({
      from: this.fromAddress,
      to: user.email,
      subject: 'Verify Your Email - Telemedicine',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #2c3e50; text-align: center;">Welcome to Telemedicine!</h2>
          <p>Hi,</p>
          <p>Thank you for registering. To complete your sign-up and verify your email address, please click the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Verify Email Address</a>
          </div>
          <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #3498db;">${verificationLink}</p>
          <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #7f8c8d; text-align: center;">This link will expire in 24 hours. If you did not create an account, no further action is required.</p>
        </div>
      `,
    });

    if (error) {
      this.logger.error(
        `Failed to send verification email to ${user.email}: ${error.message}`,
      );
      throw new Error(error.message);
    }

    this.logger.log(`Verification email sent to ${user.email}`);
  }

  async sendPasswordResetEmail(user: User, token: string) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    const { error } = await this.resend.emails.send({
      from: this.fromAddress,
      to: user.email,
      subject: 'Reset Your Password - Telemedicine',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #2c3e50; text-align: center;">Password Reset Request</h2>
          <p>Hi,</p>
          <p>We received a request to reset the password for your Telemedicine account. Click the button below to set a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #e74c3c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #e74c3c;">${resetLink}</p>
          <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #7f8c8d; text-align: center;">This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
        </div>
      `,
    });

    if (error) {
      this.logger.error(
        `Failed to send password reset email to ${user.email}: ${error.message}`,
      );
      throw new Error(error.message);
    }

    this.logger.log(`Password reset email sent to ${user.email}`);
  }
}

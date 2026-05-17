import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../users/entities/user.entity';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { RegisterDto } from './dto/register-patient.dto';
import { RegisterDoctorDto } from './dto/register-doctor.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { DoctorService } from '../doctor/doctor.service';
import { PatientsService } from '../patients/patients.service';
import { MailService } from '../mail/mail.service';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { UnauthorizedException } from '@nestjs/common';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(EmailVerificationToken)
    private readonly tokenRepository: Repository<EmailVerificationToken>,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>,
    private readonly jwtService: JwtService,
    private readonly doctorService: DoctorService,
    private readonly patientsService: PatientsService,
    private readonly mailService: MailService,
  ) { }

  // ─── Seed admin (dev only, single instance) ───────────────────────────────
  async createAdmin(dto: RegisterDto) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('This endpoint is not available in production');
    }

    const existingAdmin = await this.userRepository.findOne({
      where: { role: UserRole.ADMIN },
    });
    if (existingAdmin) {
      throw new ConflictException('An admin account already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const admin = this.userRepository.create({
      email: dto.email,
      password: hashedPassword,
      role: UserRole.ADMIN,
      timezone: dto.timezone,
      isEmailVerified: true, // admin doesn't need email verification
      isActive: true,
    });

    await this.userRepository.save(admin);

    return {
      message: 'Admin account created successfully',
      userId: admin.id,
      email: admin.email,
    };
  }

  // ─── Register ─────────────────────────────────────────────────────────────
  async register(dto: RegisterDto) {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email is already in use');
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = this.userRepository.create({
      email: dto.email,
      password: hashedPassword,
      role: dto.role,
      timezone: dto.timezone,
    });

    await this.userRepository.save(user);
    await this.sendVerificationEmail(user);

    return {
      message: 'Registration successful. Please check your email to verify your account.',
      userId: user.id,
    };
  }
  // ─── Register ─────────────────────────────────────────────────────────────
  async registerPatient(dto: RegisterDto) {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email is already in use');
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = this.userRepository.create({
      email: dto.email,
      password: hashedPassword,
      role: UserRole.PATIENT,
      timezone: dto.timezone,
    });

    await this.userRepository.save(user);

    // Create the patient profile 
    await this.patientsService.create(user.id);

    await this.sendVerificationEmail(user);

    return {
      message: 'Registration successful. Please check your email to verify your account.',
      userId: user.id,
    };
  }

  async registerDoctor(dto: RegisterDoctorDto) {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email is already in use');
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = this.userRepository.create({
      email: dto.email,
      password: hashedPassword,
      role: UserRole.DOCTOR,
      timezone: dto.timezone,
    });

    await this.userRepository.save(user);

    const doctorProfileDto = {
      firstName: dto.firstName ?? '',
      lastName: dto.lastName ?? '',
      specialtyId: dto.specialtyId,
      hospital: dto.hospital,
      licenseNo: dto.licenseNo,
    };


    await this.doctorService.create(doctorProfileDto, user.id);
    await this.sendVerificationEmail(user);

    return {
      message: 'Registration successful. Please check your email to verify your account.',
      userId: user.id,
    };
  }

  // ─── Login ────────────────────────────────────────────────────────────────
  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    if (!user.isActive) throw new UnauthorizedException('Account has been deactivated');

    return this.issueTokens(user);
  }

  async adminLogin(dto: LoginDto) {
    const user = await this.userRepository.findOne({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    if (user.role !== UserRole.ADMIN) throw new UnauthorizedException('Invalid credentials');

    if (!user.isActive) throw new UnauthorizedException('Account has been deactivated');

    return this.issueTokens(user);
  }

  // ─── Refresh token ────────────────────────────────────────────────────────
  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken);
      const user = await this.userRepository.findOne({ where: { id: payload.sub } });
      if (!user) throw new NotFoundException('User not found');
      
      return this.issueTokens(user);
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  // ─── Get current user ─────────────────────────────────────────────────────
  async getMe(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'role', 'isEmailVerified', 'timezone', 'createdAt'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async verifyEmail(token: string) {
    const record = await this.tokenRepository.findOne({
      where: {
        token,
        expiresAt: MoreThan(new Date()),
      },
      relations: ['user'],
    });

    if (!record) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    const user = record.user;
    if (user.isEmailVerified) {
      return { message: 'Email is already verified' };
    }

    user.isEmailVerified = true;
    await this.userRepository.save(user);
    await this.tokenRepository.delete({ userId: user.id });

    return { message: 'Email verification successful' };
  }

  async resendVerification(dto: { email: string }) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    // For security, We return the same success message even if user doesn't exist
    // to prevent account enumeration.
    if (!user) {
      return { message: 'If an account exists with that email, a new verification link has been sent.' };
    }

    if (user.isEmailVerified) {
      return { message: 'Email is already verified' };
    }

    await this.sendVerificationEmail(user);

    return { message: 'If an account exists with that email, a new verification link has been sent.' };
  }

  // ─── Forgot password ──────────────────────────────────────────────────────
  async forgotPassword(dto: ForgotPasswordDto) {
    const message = 'If an account with that email exists, a password reset link has been sent.';
    const user = await this.userRepository.findOne({ where: { email: dto.email } });

    if (!user || !user.isActive) return { message };

    await this.passwordResetTokenRepository.delete({ userId: user.id });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    const record = this.passwordResetTokenRepository.create({ userId: user.id, token, expiresAt });
    await this.passwordResetTokenRepository.save(record);
    await this.mailService.sendPasswordResetEmail(user, token);

    return { message };
  }

  // ─── Reset password ───────────────────────────────────────────────────────
  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.passwordResetTokenRepository.findOne({
      where: { token: dto.token, expiresAt: MoreThan(new Date()) },
      relations: ['user'],
    });

    if (!record) throw new BadRequestException('Invalid or expired reset token');

    const user = record.user;
    user.password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    await this.userRepository.save(user);
    await this.passwordResetTokenRepository.delete({ userId: user.id });

    return { message: 'Password reset successful. You can now log in with your new password.' };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  private async sendVerificationEmail(user: User) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now

    // Remove any existing tokens for this user
    await this.tokenRepository.delete({ userId: user.id });

    const tokenRecord = this.tokenRepository.create({
      userId: user.id,
      token,
      expiresAt,
    });

    await this.tokenRepository.save(tokenRecord);
    await this.mailService.sendVerificationEmail(user, token);
  }

  private issueTokens(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
    };
  }
}

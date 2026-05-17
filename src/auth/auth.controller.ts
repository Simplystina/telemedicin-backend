import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register-patient.dto';
import { RegisterDoctorDto } from './dto/register-doctor.dto';
import { LoginDto } from './dto/login.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  /** 
   * POST /auth/create-admin
   * Dev-only. Creates the first and only admin account.
   * Returns 409 if an admin already exists.
   * Returns 403 in production.
   */
  @Public()
  @Post('create-admin')
  createAdmin(@Body() dto: RegisterDto) {
    return this.authService.createAdmin(dto);
  }

  /** 
   * POST /auth/register-patient  
  */
  @Public()
  @Post('register-patient')
  registerPatient(@Body() dto: RegisterDto) {
    return this.authService.registerPatient(dto);
  }

  /** 
   * POST /auth/register-doctor  
  */
  @Public()
  @Post('register-doctor')
  registerDoctor(@Body() dto: RegisterDoctorDto) {
    return this.authService.registerDoctor(dto);
  }

  /** POST /auth/login */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /** POST /auth/admin/login — rejects if the account is not an admin */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('admin/login')
  adminLogin(@Body() dto: LoginDto) {
    return this.authService.adminLogin(dto);
  }

  /** POST /auth/refresh — requires valid refresh token to get new pair */
  @Public()
  @Post('refresh')
  refresh(
    @Body('refreshToken') bodyToken?: string,
    @Headers('authorization') authHeader?: string,
  ) {
    let token = bodyToken;
    if (!token && authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    if (!token) throw new UnauthorizedException('Refresh token is required');
    
    return this.authService.refresh(token);
  }

  /** GET /auth/me — returns the authenticated user's profile */
  @Get('me')
  getMe(@CurrentUser() user: CurrentUserPayload) {
    return this.authService.getMe(user.id);
  }

  /** GET /auth/verify-email?token=... */
  @Public()
  @Get('verify-email')
  verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  /** POST /auth/verify-email/resend */
  @Public()
  @Post('verify-email/resend')
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto);
  }

  /** POST /auth/forgot-password */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  /** POST /auth/reset-password */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}

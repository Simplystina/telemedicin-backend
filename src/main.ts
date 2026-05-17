import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    /**
     * rawBody: true preserves the raw Buffer on req.rawBody.
     * Required for Paystack webhook HMAC-SHA512 signature verification —
     * once the body is JSON-parsed the original bytes are lost.
     */
    rawBody: true,
  });

  // ─── Global prefix ────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ─── Validation ───────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,       // strip unknown fields
      forbidNonWhitelisted: false,
      transform: true,       // auto-cast query params (e.g. page → number)
    }),
  );

  // ─── Guards ───────────────────────────────────────────────────────────────
  // JwtAuthGuard is global — all routes require auth unless marked @Public().
  // RolesGuard runs after — it's a no-op on routes without @Roles().
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(reflector), new RolesGuard(reflector));

  // ─── CORS ─────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Telemedicine API running at http://localhost:${port}/api/v1`);
}
bootstrap();

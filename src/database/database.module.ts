import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const isLocal = !configService.get<string>('DB_HOST', 'localhost')
          .includes('supabase')
          && !configService.get<string>('DB_HOST', 'localhost')
          .includes('neon');

        return {
          type: 'postgres',
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 5432),
          username: configService.get<string>('DB_USERNAME', 'postgres'),
          password: configService.get<string>('DB_PASSWORD', ''),
          database: configService.get<string>('DB_NAME', 'telemedicine'),
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          synchronize: configService.get<string>('NODE_ENV') !== 'production',
          logging: configService.get<string>('NODE_ENV') === 'development',
          // SSL is required for Supabase and Neon — disabled for local Postgres
          ssl: isLocal ? false : { rejectUnauthorized: false },
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}

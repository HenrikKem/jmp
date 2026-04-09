import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class KeepAliveService {
  private readonly logger = new Logger(KeepAliveService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Ping every 6 days to prevent Supabase free-tier auto-pause (threshold: 7 days)
  @Cron('0 0 */6 * *')
  async keepAlive() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      this.logger.log('Keep-alive ping sent to database');
    } catch (err) {
      this.logger.error('Keep-alive ping failed', err);
    }
  }
}

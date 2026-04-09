import { Module } from '@nestjs/common';
import { AdminController, HealthController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  controllers: [AdminController, HealthController],
  providers: [AdminService],
})
export class AdminModule {}

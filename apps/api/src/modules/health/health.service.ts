import { Injectable } from '@nestjs/common';
import type { HealthResponse } from '@skillboard/shared';
import { PrismaService } from '../../common/prisma/prisma.service.js';

const DB_TIMEOUT_MS = 2000;

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthResponse> {
    const database = (await this.databaseUp()) ? 'up' : 'down';
    return {
      status: database === 'up' ? 'ok' : 'degraded',
      version: process.env.npm_package_version ?? 'dev',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      checks: { database },
    };
  }

  private async databaseUp(): Promise<boolean> {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('db timeout'));
      }, DB_TIMEOUT_MS).unref();
    });
    try {
      await Promise.race([this.prisma.$queryRaw`SELECT 1`, timeout]);
      return true;
    } catch {
      return false;
    }
  }
}

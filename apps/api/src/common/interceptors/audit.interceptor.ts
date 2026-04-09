import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.interface';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<{
      method: string;
      url: string;
      user?: AuthenticatedUser;
      ip: string;
      headers: Record<string, string>;
    }>();

    if (!MUTATING_METHODS.has(request.method)) {
      return next.handle();
    }

    const actorId = request.user?.id ?? null;
    const ipAddress = request.ip;
    const userAgent = request.headers['user-agent'] ?? null;

    const pathParts = request.url.split('/').filter(Boolean);
    const entityType = pathParts[0] ?? 'unknown';
    const entityId = pathParts[1] ?? null;

    return next.handle().pipe(
      tap(() => {
        this.prisma.auditLog
          .create({
            data: {
              actorId,
              action: request.method,
              entityType,
              entityId,
              ipAddress,
              userAgent,
            },
          })
          .catch((err: unknown) => {
            this.logger.error('Audit log write failed', err);
          });
      }),
    );
  }
}

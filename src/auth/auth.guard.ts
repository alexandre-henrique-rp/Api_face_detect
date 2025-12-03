import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private prisma: PrismaService) { }

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('API Key não fornecida');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        api_key: apiKey,
      },
      select: {
        id: true,
        name: true,
        email: true,
        rota_response: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('API Key não cadastrada');
    }

    // Anexa o usuário ao objeto request para uso nos controllers
    request.user = user;

    return true;
  }
}

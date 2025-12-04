import { HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as crypto from 'crypto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  login(email: string, password: string) {
    try {
      return this.prisma.user_adm.findUnique({
        where: {
          email: email,
          password: password,
        },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });
    } catch (error) {
      throw new HttpException("Erro ao fazer login", 401);
    }
  }

  async register(body: RegisterDto) { 
    try {
      const exit = await this.prisma.user.findUnique({
        where: {
          email: body.email,
        },
      })
      if (exit) {
        throw new HttpException("Usuário já cadastrado", 401);
      }
      return await this.prisma.user.create({
        data: {
          email: body.email,
          // gerar uma api_key aleatória alphanumeric no máximo 20 caracteres
          api_key: crypto.randomBytes(20).toString('hex'),
          rota_response: body.rota_response,
          name: body.name,
        },
        select: {
          id: true,
          email: true,
          name: true,
          api_key: true,
        },
      });
    } catch (error) {
      throw new HttpException(error instanceof Error ? error.message : "Erro ao cadastrar usuário", 401);
    }
  }
}

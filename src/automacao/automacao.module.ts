import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AutomacaoController } from './automacao.controller';
import { AutomacaoService } from './automacao.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AutomacaoController],
  providers: [AutomacaoService],
})
export class AutomacaoModule { }

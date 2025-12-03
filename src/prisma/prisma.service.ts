import { Injectable } from '@nestjs/common';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from 'generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL });
    super({
      adapter,
      log: [] // Desativa todos os logs do Prisma
    });
  }

  /**
   * Inicializa o serviço e verifica se o banco de dados está acessível
   */
  async onModuleInit() {
    try {
      // Conecta ao banco de dados
      await this.$connect();

      // Verifica se o banco está acessível com uma query simples
      await this.$queryRaw`SELECT 1`;

      console.log('✅ Banco de dados conectado com sucesso');

      // Executa o seed para garantir usuário administrador
      await this.executarSeed();

    } catch (error) {
      console.error('❌ Erro ao conectar ao banco de dados:', error);
      throw error;
    }
  }

  /**
   * Executa o seed do usuário administrador
   */
  private async executarSeed() {
    try {
      // Verificar se já existe um usuário administrador
      const existingAdmin = await this.user_adm.findUnique({
        where: { email: 'arinterface@gmail.com' }
      });

      if (!existingAdmin) {
        // Criar usuário administrador padrão
        const admin = await this.user_adm.create({
          data: {
            name: 'ADM',
            email: 'arinterface@gmail.com',
            password: '1234'
          }
        });

        console.log('✅ Usuário administrador padrão criado:', {
          id: admin.id,
          name: admin.name,
          email: admin.email
        });
      } else {
        console.log('ℹ️ Usuário administrador já existe:', {
          id: existingAdmin.id,
          name: existingAdmin.name,
          email: existingAdmin.email
        });
      }
    } catch (error) {
      console.error('❌ Erro ao executar seed:', error);
    }
  }

  /**
   * Limpa a conexão ao encerrar o módulo
   */
  async onModuleDestroy() {
    await this.$disconnect();
  }
}

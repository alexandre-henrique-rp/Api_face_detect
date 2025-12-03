import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';


@Injectable()
export class AutomacaoService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService
  ) { }

  async findAll(id: string) {
    const dosie = await this.prisma.dosie.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!dosie) return this.renderError("Processo não existe");

    if (dosie.status === 'APPROVED') return this.renderApproved(dosie);

    // Retorna tela de Login inicial
    return this.renderLogin(id);
  }

  async processLogin(body: any) {
    try {
      const user = await this.authService.login(body.email, body.password);

      if (!user) {
        return this.renderLogin(body.dosieId, "Email ou senha inválidos");
      }

      // Retorna o Painel com dados do usuário logado
      // Usando user.id como token simples já que AuthService não retorna JWT
      return this.renderPainel(body.dosieId, user, user.id);
    } catch (e) {
      return this.renderLogin(body.dosieId, "Erro no login: " + e.message);
    }
  }

  async processDecision(body: any) {
    try {
      const { dosieId, status, obs, userId } = body;

      // Verificar se o dosie existe
      const dosieAtual = await this.prisma.dosie.findUnique({ where: { id: dosieId } });
      if (!dosieAtual) return this.renderError("Dossiê não encontrado");

      // Atualizar Dossiê
      await this.prisma.dosie.update({
        where: { id: dosieId },
        data: {
          status: status,
          processedBy: "HUMANO",
          processedAt: new Date(),
          logs: `${dosieAtual.logs}\nDosie atualizado para ${status} em ${new Date().toISOString()} por HUMANO (ID: ${userId})`,
          processedObs: obs
        }
      });

      // Aqui poderíamos chamar o AppService para notificar webhooks, se necessário.
      // Mas para manter simples, apenas atualizamos o banco.

      return this.renderSuccess(dosieId, status);

    } catch (e) {
      return this.renderError("Erro ao processar decisão: " + e.message);
    }
  }

  // --- HTML RENDERERS ---

  private renderLogin(dosieId: string, error: string = "") {
    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login - Validação</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-100 h-screen flex items-center justify-center">
        <div class="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
          <h2 class="text-2xl font-bold text-center mb-6 text-gray-800">Login Administrativo</h2>
          <form action="/automacao/login" method="POST" class="space-y-4">
            <input type="hidden" name="dosieId" value="${dosieId}">
            <div>
              <label class="block text-sm font-medium text-gray-700">Email</label>
              <input type="email" name="email" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Senha</label>
              <input type="password" name="password" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
            </div>
            ${error ? `<div class="text-red-500 text-sm text-center">${error}</div>` : ''}
            <button type="submit" class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">Entrar</button>
          </form>
        </div>
      </body>
      </html>
    `;
  }

  private async renderPainel(dosieId: string, user: any, token: string) {
    const dosie = await this.prisma.dosie.findUnique({
      where: { id: dosieId },
      include: { image: true, document: true }
    });
    if (!dosie) return this.renderError("Dossiê não encontrado após login");

    const getFileSrc = (fileRecord: any) => {
      try {
        if (!fileRecord || !fs.existsSync(fileRecord.path)) return '';
        const buffer = fs.readFileSync(fileRecord.path);
        const base64 = buffer.toString('base64');
        let mime = fileRecord.extension || 'application/octet-stream';
        if (!mime.includes('/')) {
          if (mime === 'pdf') mime = 'application/pdf';
          else mime = `image/${mime}`;
        }
        return `data:${mime};base64,${base64}`;
      } catch (e) {
        return '';
      }
    };

    const imageSrc = getFileSrc(dosie.image);
    const docSrc = getFileSrc(dosie.document);

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Validação - ${dosieId}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
      </head>
      <body class="bg-gray-100 min-h-screen font-sans p-4 pb-24">
        <div class="container mx-auto">
          <header class="bg-white shadow rounded-lg p-4 mb-6 flex justify-between items-center">
             <div>
                <h1 class="text-xl font-bold text-gray-800">Validação de Identidade</h1>
                <p class="text-sm text-gray-500">ID: ${dosie.id}</p>
             </div>
             <div class="flex items-center gap-4">
                <span class="text-sm text-gray-600">Olá, ${user.name || user.email}</span>
                <a href="/automacao/face_detection/${dosie.id}" class="text-red-600 hover:text-red-800 text-sm font-semibold">Sair</a>
             </div>
          </header>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Fotos -->
            <div class="bg-white p-4 rounded-lg shadow">
              <h3 class="font-semibold mb-2 text-gray-700 border-b pb-2">Foto Selfie</h3>
              <div class="flex justify-center items-center bg-gray-100 rounded h-[500px] overflow-hidden">
                ${imageSrc ? `<img src="${imageSrc}" class="max-h-full max-w-full object-contain">` : '<span class="text-red-500">Imagem não encontrada</span>'}
              </div>
            </div>
            <div class="bg-white p-4 rounded-lg shadow">
              <h3 class="font-semibold mb-2 text-gray-700 border-b pb-2">Documento</h3>
              <div class="flex justify-center items-center bg-gray-100 rounded h-[500px] overflow-hidden">
                ${docSrc ? `<iframe src="${docSrc}" class="w-full h-full border-0 bg-white"></iframe>` : '<span class="text-red-500">Documento não encontrado</span>'}
              </div>
            </div>

            <!-- Formulário de Decisão -->
            <div class="bg-white p-6 rounded-lg shadow lg:col-span-2">
              <form action="/automacao/decisao" method="POST">
                <input type="hidden" name="dosieId" value="${dosie.id}">
                <input type="hidden" name="userId" value="${user.id}">
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Histórico</label>
                    <textarea readonly class="w-full h-32 p-2 border border-gray-300 rounded-md bg-gray-50 text-xs font-mono resize-none">${dosie.logs || ''}\nObs Ant: ${dosie.processedObs || ''}</textarea>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Observação</label>
                    <textarea name="obs" class="w-full h-32 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 resize-none" placeholder="Motivo...">${dosie.processedObs || ''}</textarea>
                  </div>
                </div>

                <div class="mt-6 flex justify-end gap-4">
                  <button type="submit" name="status" value="REJECTED" class="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded shadow flex items-center">
                    <i class="fas fa-times-circle mr-2"></i> REJEITAR
                  </button>
                  <button type="submit" name="status" value="APPROVED" class="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded shadow flex items-center">
                    <i class="fas fa-check-circle mr-2"></i> APROVAR
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private renderSuccess(dosieId: string, status: string) {
    return `
      <html>
      <head><script src="https://cdn.tailwindcss.com"></script></head>
      <body class="bg-gray-100 h-screen flex items-center justify-center">
        <div class="bg-white p-8 rounded-lg shadow-md text-center">
          <h1 class="text-2xl font-bold ${status === 'APPROVED' ? 'text-green-600' : 'text-red-600'} mb-4">
            Dossiê ${status === 'APPROVED' ? 'Aprovado' : 'Rejeitado'}!
          </h1>
          <p class="text-gray-600 mb-6">O processo foi atualizado com sucesso.</p>
          <a href="/automacao/face_detection/${dosieId}" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Voltar</a>
        </div>
      </body>
      </html>
    `;
  }

  private renderApproved(dosie: any) {
    return `
      <html>
      <head><script src="https://cdn.tailwindcss.com"></script></head>
      <body class="bg-gray-100 h-screen flex items-center justify-center">
        <div class="bg-white p-8 rounded-lg shadow-md text-center">
          <h1 class="text-2xl font-bold text-green-600 mb-4">Já Processado</h1>
          <p class="text-gray-600">Status: <strong>${dosie.status}</strong></p>
          <p class="text-gray-500 text-sm mt-2">Processado em: ${dosie.processedAt}</p>
        </div>
      </body>
      </html>
    `;
  }

  private renderError(msg: string) {
    return `
      <html>
      <body style="font-family: sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; background:#f3f4f6;">
        <div style="background:white; padding:2rem; border-radius:8px; box-shadow:0 4px 6px rgba(0,0,0,0.1); text-align:center;">
          <h1 style="color:#dc2626; margin-bottom:1rem;">Erro</h1>
          <p style="color:#4b5563;">${msg}</p>
        </div>
      </body>
      </html>
    `;
  }
}

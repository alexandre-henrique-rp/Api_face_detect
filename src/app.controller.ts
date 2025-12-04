import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Req, Res, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBadRequestResponse, ApiBody, ApiConsumes, ApiExcludeEndpoint, ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiSecurity } from '@nestjs/swagger';
import { Response } from 'express';
import * as fs from 'fs';
import { AppService } from './app.service';
import { AuthGuard } from './auth/auth.guard';
import { FaceCheckDto } from './dto/face_check.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Post('upload')
  @ApiSecurity('api_key')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Upload de foto e documento para verificação de correspondência facial',
    description: `Este endpoint permite o envio de uma **foto de rosto (selfie)** e um **documento de identificação** para realizar a validação biométrica facial.

### 📋 Regras de Envio:
- **Foto:** Formatos aceitos: \`jpg\`, \`jpeg\`, \`png\`, \`webp\`.
- **Documento:** Formatos aceitos: \`pdf\`, \`jpg\`, \`jpeg\`, \`png\`, \`webp\`.
- **Tamanho Máximo:** O tamanho máximo permitido por arquivo é de **5MB**.

### ℹ️ Detalhes do Processamento:
- O sistema analisará a foto e o documento para calcular a **confiança da correspondência facial**.
- O retorno será um JSON contendo o status da operação.
- **Nota:** Se o status for **"PENDING"**, o processamento continuará em segundo plano. O resultado final ficará disponível para consulta ou será enviado para a **URL de callback** (webhook) cadastrada.`
  })
  @ApiConsumes('multipart/form-data') // 1. Define que consome multipart
  @UseInterceptors(FileFieldsInterceptor(
    [
      { name: 'foto', maxCount: 1 },
      { name: 'documento', maxCount: 1 },
    ],
    {
      // Lógica para Limitar Tipos de Arquivos
      fileFilter: (req, file, callback) => {
        // Validação da FOTO (apenas imagens)
        if (file.fieldname === 'foto') {
          if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
            return callback(new BadRequestException('A foto deve ser uma imagem (jpg, jpeg, png, webp)'), false);
          }
        }

        // Validação do DOCUMENTO (apenas PDF ou imagens)
        if (file.fieldname === 'documento') {
          if (!file.mimetype.match(/\/(pdf|jpg|jpeg|png|webp)$/)) {
            return callback(new BadRequestException('O documento deve ser um PDF ou imagem (jpg, jpeg, png, webp)'), false);
          }
        }

        callback(null, true);
      },
      // (Opcional) Limitar tamanho (ex: 5MB)
      limits: { fileSize: 5 * 1024 * 1024 }
    }
  ))
  @ApiBody({
    description: 'Arquivos obrigatórios',
    required: true,
    schema: {
      type: 'object',
      required: ['foto', 'documento'], // <--- TORNAR OBRIGATÓRIO NO SWAGGER
      properties: {
        foto: {
          description: 'Arquivo de imagem (jpg, png)',
          type: 'string',
          format: 'binary',
        },
        documento: {
          description: 'Arquivo de documento (pdf)',
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Imagens enviadas com sucesso',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            status: { type: 'string' },
            create: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  })
  @ApiBadRequestResponse({
    description: 'Erro ao enviar imagens',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Erro ao processar os arquivos' }
      }
    }
  })
  @ApiNotFoundResponse({
    description: 'Usuário não encontrado',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Usuário não encontrado' }
      }
    }
  })
  async postImage(@UploadedFiles() files: { foto?: Express.Multer.File[], documento?: Express.Multer.File[] }, @Req() req: Express.Request) {
    return this.appService.postImage(files, req.user);
  }


  @Post('validate/dosie')
  @ApiExcludeEndpoint()
  async validateImage(@Body() body: FaceCheckDto) {
    return this.appService.faceCheck(body);
  }

  @Get('dosie/:id')
  @ApiSecurity('api_key')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Obter dados do dosie pelo ID',
    description: `Este endpoint recupera os **detalhes completos** de um dossiê de validação facial a partir do seu ID.

### 📦 Dados Retornados:
- **Status Atual:** O estado do processamento (ex: \`PENDING\`, \`APPROVED\`, \`REJECTED\`).
- **IDs de Arquivos:** Identificadores para a foto e o documento associados.
- **Observações:** Detalhes sobre o resultado da análise.
- **Datas:** Carimbos de data/hora de criação e última atualização.

### 🔍 Casos de Uso:
- Verificar o resultado de uma análise que estava pendente.
- Consultar o histórico de validações.`
  })
  @ApiParam({
    name: 'id',
    description: 'ID do dosie',
    required: true,
    type: String
  })
  @ApiOkResponse({
    description: 'Dados do dosie retornados com sucesso',
    schema: {
      type: 'object',
      properties: {
        "id": { type: 'string', description: 'ID do dosie' },
        "status": { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'], description: 'Status do dosie' },
        "imageId": { type: 'string', description: 'ID da imagem associada' },
        "documentId": { type: 'string', description: 'ID do documento associado' },
        "processedObs": { type: 'string', description: 'Observações do processamento' },
        "createdAt": { type: 'string', format: 'date-time', description: 'Data de criação' },
        "updatedAt": { type: 'string', format: 'date-time', description: 'Data de atualização' }
      },
    },
    example: {
      id: '123',
      status: 'APPROVED',
      imageId: 'img_456',
      documentId: 'doc_789',
      processedObs: 'Processamento concluído com sucesso',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    }
  })
  @ApiBadRequestResponse({
    description: 'Erro ao obter dados do dosie',
  })

  @ApiNotFoundResponse({
    description: 'Dosie não encontrado',
  })
  async getDosie(@Param('id') id: string) {
    return this.appService.getDosie(id);
  }

  @Get('view/foto/:id')
  @ApiOperation({
    summary: 'Visualizar foto por ID',
    description: `Este endpoint permite a **visualização direta** da foto armazenada.

### 🖼️ Comportamento:
- Ao acessar esta rota pelo navegador, a imagem será **exibida diretamente** na tela (Content-Disposition: inline).
- A imagem é transmitida como um fluxo de dados (stream), não sendo necessário baixá-la previamente.
- Formatos suportados: \`jpg\`, \`jpeg\`, \`png\`, \`webp\`.`
  })
  @ApiParam({ name: 'id', description: 'ID da foto a ser visualizada', required: true, type: String })
  @ApiOkResponse({
    description: 'Foto recuperada com sucesso. A imagem é retornada diretamente (stream).',
    content: {
      'image/jpeg': { schema: { type: 'string', format: 'binary' } },
      'image/png': { schema: { type: 'string', format: 'binary' } },
      'image/webp': { schema: { type: 'string', format: 'binary' } }
    },
  })
  @ApiNotFoundResponse({
    description: 'Imagem não encontrada'
  })
  @ApiInternalServerErrorResponse({
    description: 'Erro interno do servidor'
  })
  async viewImageFoto(@Param('id') id: string, @Res() res: Response) {
    const image = await this.appService.getImageFoto(id);

    if (!image || !fs.existsSync(image.path)) {
      throw new NotFoundException('Imagem não encontrada');
    }

    res.setHeader('Content-Type', image.extension || 'image/jpeg');
    res.setHeader('Content-Disposition', `inline; filename="${image.originalName}"`);
    fs.createReadStream(image.path).pipe(res);
  }

  @Get('view/documento/:id')
  @ApiOperation({
    summary: 'Visualizar documento por ID',
    description: `Este endpoint permite a **visualização direta** do documento armazenado.

### 📄 Comportamento:
- Ao acessar esta rota pelo navegador, o documento será **exibido diretamente** na tela (Content-Disposition: inline).
- Se for um **PDF**, o visualizador nativo do navegador será aberto.
- Se for uma **imagem**, ela será renderizada na página.
- Formatos suportados: \`pdf\`, \`jpg\`, \`jpeg\`, \`png\`, \`webp\`.`
  })
  @ApiParam({ name: 'id', description: 'ID do documento a ser visualizado', required: true, type: String })
  @ApiOkResponse({
    description: 'Documento retornado com sucesso',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary'
        }
      },
      'image/jpeg': {
        schema: {
          type: 'string',
          format: 'binary'
        }
      },
      'image/png': {
        schema: {
          type: 'string',
          format: 'binary'
        }
      },
      'application/octet-stream': {
        schema: {
          type: 'string',
          format: 'binary'
        }
      }
    }
  })
  @ApiNotFoundResponse({
    description: 'Imagem não encontrada'
  })
  @ApiInternalServerErrorResponse({
    description: 'Erro interno do servidor'
  })
  async viewImageDocumento(@Param('id') id: string, @Res() res: Response) {
    const doc = await this.appService.getImageDocumento(id);

    if (!doc || !fs.existsSync(doc.path)) {
      throw new NotFoundException('Documento não encontrada');
    }

    res.setHeader('Content-Type', doc.extension || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${doc.originalName}"`);
    fs.createReadStream(doc.path).pipe(res);
  }
}

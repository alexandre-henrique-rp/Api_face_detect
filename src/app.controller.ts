import { Body, Controller, Get, NotFoundException, Param, Post, Req, Res, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBadRequestResponse, ApiBody, ApiExcludeEndpoint, ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiSecurity } from '@nestjs/swagger';
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
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'foto', maxCount: 1 },
    { name: 'documento', maxCount: 1 },
  ]))
  @ApiBody({
    description: 'Arquivos',
    type: 'multipart/form-data',
    required: true,
    schema: {
      type: 'object',
      properties: {
        foto: {
          type: 'string',
          format: 'binary',
        },
        documento: {
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
  @ApiOperation({ summary: 'Obter dados do dosie pelo ID' })
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
  @ApiParam({ name: 'id', description: 'ID da foto a ser visualizada', required: true, type: String })
  @ApiOkResponse({
    description: 'Foto retornada com sucesso',
    content: {
      'image/jpeg': {
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
  @ApiParam({ name: 'id', description: 'ID do documento a ser visualizado', required: true, type: String })
  @ApiOkResponse({
    description: 'Foto retornada com sucesso',
    content: {
      'image/jpeg': {
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

import { Body, Controller, Get, NotFoundException, Param, Post, Req, Res, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiSecurity } from '@nestjs/swagger';
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
  async postImage(@UploadedFiles() files: { foto?: Express.Multer.File[], documento?: Express.Multer.File[] }, @Req() req: Express.Request) {
    return this.appService.postImage(files, req.user);
  }
  

  @Post('validate/dosie')
  async validateImage(@Body() body: FaceCheckDto) {
    return this.appService.faceCheck(body);
  }

  
  @Get('dosie/:id')
  async getDosie(@Param('id') id: string) {
    return this.appService.getDosie(id);
  }

  @Get('view/foto/:id')
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

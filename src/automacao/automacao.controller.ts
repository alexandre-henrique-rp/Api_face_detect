import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { AutomacaoService } from './automacao.service';

@ApiExcludeController()
@Controller('automacao')
export class AutomacaoController {
  constructor(private readonly automacaoService: AutomacaoService) { }


  @Get('face_detection/:id')
  findAll(@Param('id') id: string) {
    // essa rota retorna um html que vai fazer o login do adm e depois apresenta o resultado
    return this.automacaoService.findAll(id);
  }

  @Post('login')
  login(@Body() body: any) {
    return this.automacaoService.processLogin(body);
  }

  @Post('decisao')
  decisao(@Body() body: any) {
    return this.automacaoService.processDecision(body);
  }
}


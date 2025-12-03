import { Test, TestingModule } from '@nestjs/testing';
import { AutomacaoController } from './automacao.controller';
import { AutomacaoService } from './automacao.service';

describe('AutomacaoController', () => {
  let controller: AutomacaoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AutomacaoController],
      providers: [AutomacaoService],
    }).compile();

    controller = module.get<AutomacaoController>(AutomacaoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

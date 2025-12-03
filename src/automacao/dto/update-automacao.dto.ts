import { PartialType } from '@nestjs/swagger';
import { CreateAutomacaoDto } from './create-automacao.dto';

export class UpdateAutomacaoDto extends PartialType(CreateAutomacaoDto) {}

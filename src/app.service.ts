import { GoogleGenAI, Type } from '@google/genai';
import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { AuthEntity } from './auth/entitie/auth.entity';
import { FaceCheckDto } from './dto/face_check.dto';
import { FaceRecognitionService } from './face-recognition.service';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService, private faceRecognitionService: FaceRecognitionService) { }


  async postImage(files: { foto?: Express.Multer.File[], documento?: Express.Multer.File[] }, user: AuthEntity) {
    try {
      const document = files.documento?.[0];
      const image = files.foto?.[0];

      if (!image || !document) {
        console.log("❌ Arquivos faltando - image:", !!image, "document:", !!document);
        throw new Error('Ambos os arquivos (foto e documento) são obrigatórios');
      }

      console.log("✅ Validação passou, iniciando fluxo...");

      // 1. Salvar arquivos primeiro
      const imagePath = this.saveImage(image, 'images');
      console.log("📁 Imagem salva em:", imagePath);

      const documentPath = this.saveImage(document, 'documents');
      console.log("📁 Documento salvo em:", documentPath);

      // 2. Gerar face hash usando face-api
      console.log("🤖 Gerando face hash com reconhecimento facial...");
      const faceResult = await this.faceRecognitionService.generateFaceHash(imagePath);
      console.log("✅ Face hash gerado:", faceResult.sucesso ? "Sucesso" : "Falha");

      if (!faceResult.sucesso) {
        console.warn("⚠️ Erro ao gerar face hash:", faceResult.error);
        // Continuar o processo mesmo sem face hash, mas registrar o erro
      }

      // 3. Verificar duplicatas antes de salvar no banco
      if (faceResult.sucesso && faceResult.faceHash) {
        console.log("🔍 Verificando duplicidade facial no banco...");
        const duplicidade = await this.CheckDuplicateFaceHash(faceResult.faceHash);
        if (duplicidade.found) {
          console.warn("⚠️ Atenção: Face duplicada detectada!");
          console.warn(`   Similaridade: ${duplicidade.image.faceHash} (ID: ${duplicidade.image.id})`);

          // 🔴 CLEANUP: Deletar arquivos e não salvar nada no banco
          console.log("🗑️ Excluindo arquivos devido à duplicidade...");
          try {
            if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
            if (fs.existsSync(documentPath)) fs.unlinkSync(documentPath);
            console.log("✅ Arquivos excluídos com sucesso.");
          } catch (cleanupError) {
            console.error("❌ Erro ao excluir arquivos:", cleanupError);
          }

          return {
            message: 'Biometria duplicada detectada',
            data: {
              status: "REJECTED",
              reason: "Duplicidade biométrica",
              originalImageId: duplicidade.image.id // Retorna ID da imagem original para referência
            },
          };
        }
      }

      // 4. Criar registros no banco (apenas se não houver duplicata)
      console.log("💾 Criando registro de imagem no banco...");
      const imageRecord = await this.prisma.image.create({
        data: {
          originalName: image.originalname,
          name: imagePath.split('/').pop() || '',
          size: BigInt(image.size),
          extension: image.mimetype || '',
          path: imagePath,
          faceHash: faceResult.faceHash || '',
          // Campos biométricos antigos removidos
        },
      });
      console.log("✅ Imagem registrada:", imageRecord.id);

      console.log("💾 Criando registro de documento no banco...");
      const documentRecord = await this.prisma.document.create({
        data: {
          originalName: document.originalname,
          name: documentPath.split('/').pop() || '',
          size: BigInt(document.size),
          extension: document.mimetype || '',
          path: documentPath,
        },
      });
      console.log("✅ Documento registrado:", documentRecord.id);

      // 5. Criar dosie com os IDs dos registros
      console.log("📋 Criando Dosie...");
      const dosie = await this.RegistreDosie(imageRecord.id, documentRecord.id, user.id);

      // 6. Verificar compatibilidade foto-documento
      console.log("🔍 Validando correspondência entre foto e documento...");
      const validacaoDoc = await this.validadeImageDoc(imagePath, documentPath);
      console.log("✅ Validação documental concluída:", validacaoDoc.match);

      if (validacaoDoc.requer_analise_humana || !validacaoDoc.match) {
        await this.UpdateDosie(dosie.id, "PENDING", "HUMANO");

        // mandar para o webhook do discord se a URL estiver configurada
        const url = process.env.DISCORD_WEB_HOOK_URL
        if (url && url !== 'undefined') {
          const data = {
            content: `Novo dosie criado: ${dosie.id}\nNecessita de validação humana\n\n🔗 [Acessar Dossiê](${process.env.URL_PADRAO}/automacao/face_detection/${dosie.id})`, 
          };
          await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          });
        } else {
          console.warn("⚠️ DISCORD_WEBHOOK_URL não configurada, notificação não enviada");
        }

        return {
          message: 'Upload processado, aguardando análise de segurança',
          data: {
            id: dosie.id,
            status: "PENDING",
            create: dosie.createdAt.toISOString()
          },
        };
      }

      // if (validacaoDoc.alerta_parentesco) {
      //   await this.UpdateDosie(dosie.id, "REJECTED", "IA");
      //   const data = {
      //     message: 'Parentesco detectado, upload rejeitado',
      //     data: {
      //       id: dosie.id,
      //       status: "REJECTED",
      //       create: dosie.createdAt.toISOString()
      //     },
      //   };
      //   // Enviar resposta para o usuário se a rota estiver configurada
      //   if (user.rota_response && user.rota_response !== 'undefined') {
      //     try {
      //       await fetch(user.rota_response, {
      //         method: 'POST',
      //         headers: {
      //           'Content-Type': 'application/json',
      //         },
      //         body: JSON.stringify(data),
      //       });
      //     } catch (fetchError) {
      //       console.warn("⚠️ Erro ao enviar resposta para usuário:", fetchError.message);
      //       // Não quebra o processo se a rota de resposta falhar
      //     }
      //   } else {
      //     console.warn("⚠️ rota_response não configurada, resposta não enviada para usuário");
      //   }

      //   return data;
      // }

      await this.UpdateDosie(dosie.id, validacaoDoc.match ? "APPROVED" : "REJECTED", "IA");
      const data = {
        message: 'Upload processado com sucesso',
        data: {
          id: dosie.id,
          status: validacaoDoc.match ? "APPROVED" : "REJECTED",
          create: dosie.createdAt.toISOString()
        },
      };

      // // Enviar resposta para o usuário apenas se for REJECTED
      // if (!validacaoDoc.match && user.rota_response && user.rota_response !== 'undefined') {
      //   try {
      //     await fetch(user.rota_response, {
      //       method: 'POST',
      //       headers: {
      //         'Content-Type': 'application/json',
      //       },
      //       body: JSON.stringify(data),
      //     });
      //   } catch (fetchError) {
      //     console.warn("⚠️ Erro ao enviar resposta para usuário:", fetchError.message);
      //     // Não quebra o processo se a rota de resposta falhar
      //   }
      // }

      return data;

    } catch (error) {
      console.error("❌ Erro no postImage:", error);
      console.error("❌ Stack trace:", error.stack);

      if (error instanceof Error) {
        throw new Error(`Erro no upload: ${error.message}`);
      }

      throw new Error('Erro interno no processamento do upload');
    }
  }

  async CheckDuplicateFaceHash(faceHash: string) {
    console.log("🔍 Buscando face hash idêntico:");

    const duplicata = await this.prisma.image.findFirst({
      where: {
        faceHash: faceHash
      }
    });

    if (duplicata) {
      console.log("🔍 Face hash duplicado encontrado:", {
        id: duplicata.id,
        faceHash: duplicata.faceHash.substring(0, 16) + '...'
      });
    }

    return {
      found: !!duplicata,
      image: duplicata
    };
  }

  async validadeImageDoc(fotoPath: string, docPath: string): Promise<{
    match: boolean,
    similaridade: number,
    confianca: string,
    threshold_recomendado: number,
    alerta_parentesco: boolean,
    requer_analise_humana: boolean,
    motivo_analise_humana: string
  }> {

    try {
      if (!process.env.GEMINI_API_KEY) {
        console.error("❌ GEMINI_API_KEY não configurada");
        throw new Error("GEMINI_API_KEY não configurada");
      }

      const key = process.env.GEMINI_API_KEY;

      // 1. Configurar Google Gen AI
      const genAI = new GoogleGenAI({ apiKey: key });

      // 2. ler o prompt
      const promptPath = path.join(process.cwd(), 'pronpts', 'prompt_face_comparison_v3.md');

      if (!fs.existsSync(promptPath)) {
        throw new Error(`Arquivo de prompt não encontrado: ${promptPath}`);
      }

      const prompt = fs.readFileSync(promptPath, 'utf8');

      // 3. ler as imagens e preparar para base64
      const fotoBuffer = fs.readFileSync(fotoPath);
      const docBuffer = fs.readFileSync(docPath);

      const fotoBase64 = fotoBuffer.toString('base64');
      const docBase64 = docBuffer.toString('base64');

      // Detectar tipo MIME do documento
      const docExt = docPath.split('.').pop()?.toLowerCase();
      const docMimeType = docExt === 'pdf' ? 'application/pdf' : 'image/jpeg';
      const fotoMimeType = 'image/jpeg';

      // 4. enviar para o Gemini
      const result = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: fotoMimeType,
                  data: fotoBase64
                }
              },
              {
                inlineData: {
                  mimeType: docMimeType,
                  data: docBase64
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              match: { type: Type.BOOLEAN },
              similaridade: { type: Type.NUMBER },
              confianca: { type: Type.STRING },
              threshold_recomendado: { type: Type.NUMBER },
              alerta_parentesco: { type: Type.BOOLEAN },
              requer_analise_humana: { type: Type.BOOLEAN },
              motivo_analise_humana: { type: Type.STRING }
            },
            required: ["match", "similaridade", "confianca", "threshold_recomendado", "alerta_parentesco", "requer_analise_humana", "motivo_analise_humana"]
          }
        }
      });

      if (!result.responseId) {
        throw new Error("Sem resposta do Gemini");
      }

      const text = result.text;
      const data = JSON.parse(text);

      return data;
    } catch (error) {
      console.error("❌ Erro na validação da imagem:", error);
      return {
        match: false,
        similaridade: 0,
        confianca: "erro",
        threshold_recomendado: 0,
        alerta_parentesco: false,
        requer_analise_humana: true,
        motivo_analise_humana: "Erro ao processar"
      };
    }

  }

  saveImage(buffer: Express.Multer.File, local: string): string {
    try {
      console.log(`📁 Salvando arquivo na pasta: ${local}`);
      const path = `./uploads/${local}`;

      // Verificar se a pasta existe, criar se não existir
      if (!fs.existsSync(path)) {
        console.log(`📁 Criando pasta: ${path}`);
        fs.mkdirSync(path, { recursive: true });
      }

      const ext = buffer.originalname.split('.').pop();
      const fileNewName = `${Date.now()}.${ext}`;
      const filePath = `${path}/${fileNewName}`;

      console.log(`💾 Salvando arquivo: ${filePath}`);
      fs.writeFileSync(filePath, buffer.buffer);
      console.log(`✅ Arquivo salvo com sucesso!`);

      return filePath;
    } catch (error) {
      console.error("❌ Erro ao salvar imagem:", error);
      throw new Error(`Error ao salvar imagem: ${error.message}`);
    }
  }

  async RegistreDosie(imageId: string, documentId: string, userId: string) {
    try {
      const dosie = await this.prisma.dosie.create({
        data: {
          logs: `Dosie criado em ${new Date().toISOString()}`,
          imageId: imageId,
          documentId: documentId,
          userId: userId,
        },
      });
      return dosie;
    } catch (error) {
      throw new Error('Error ao registrar dosie');
    }
  }
  async UpdateDosie(id: string, status: "PENDING" | "APPROVED" | "REJECTED", processedBy: "IA" | "HUMANO", processedObs?: string) {
    try {
      // Buscar o dosie atual para obter o logs existente
      const dosieAtual = await this.prisma.dosie.findUnique({
        where: { id: id },
        select: { logs: true }
      });

      if (!dosieAtual) {
        throw new Error('Dosie não encontrado');
      }

      const dosie = await this.prisma.dosie.update({
        where: {
          id: id,
        },
        data: {
          status: status,
          processedBy: processedBy,
          processedAt: new Date(),
          logs: `${dosieAtual.logs}\nDosie atualizado para ${status} em ${new Date().toISOString()} por ${processedBy}`,
          ...(processedObs && { processedObs: processedObs })
        },
      });
      return dosie;
    } catch (error) {
      throw new Error('Error ao atualizar dosie');
    }
  }

  async faceCheck(body: FaceCheckDto) {
    console.log("🚀 ~ AppService ~ faceCheck ~ body:", body)
    try {
      
      const dosie = await this.prisma.dosie.findUnique({
        where: { id: body.dosie_id },
        select: { logs: true, userId: true, user: true }
      });
      if (!dosie) {
        throw new Error('Dosie não encontrado');
      }
      await this.UpdateDosie(body.dosie_id, body.status, "HUMANO", body.obs);
      const data = {
        message: 'Upload processado com sucesso',
        data: {
          id: body.dosie_id,
          status: body.status,
          create: new Date().toISOString()
        },
      };
      // Enviar resposta para o usuário se a rota estiver configurada
      if (dosie.user.rota_response && dosie.user.rota_response !== 'undefined') {
        try {
          await fetch(dosie.user.rota_response, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          });
        } catch (fetchError) {
          console.warn("⚠️ Erro ao enviar resposta para usuário no faceCheck:", fetchError.message);
          // Não quebra o processo se a rota de resposta falhar
        }
      } else {
        console.warn("⚠️ rota_response não configurada no faceCheck, resposta não enviada");
      }

      return data;
    } catch (error) {
      throw new Error('Error ao processar upload');
    }
  }

  async getDosie(id: string) {
    try {
      const dosie = await this.prisma.dosie.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          imageId: true,
          documentId: true,
          processedObs: true,
          createdAt: true,
          updatedAt: true,
        }
      });

      if (!dosie) {
        throw new Error('Dosie não encontrado');
      }

      return dosie;
    } catch (error) {
      throw new Error('Error ao buscar dosie');
    }
  }

  getImageFoto(id: string) { 
    // retornar view image
   return this.prisma.image.findUnique({ where: { id } });
  }

  getImageDocumento(id: string) { 
    // retornar view document image
    return this.prisma.document.findUnique({ where: { id } });
  }

}

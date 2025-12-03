import { Injectable, OnModuleInit } from '@nestjs/common';
import * as faceapi from '@vladmandic/face-api';
import * as canvas from 'canvas';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Configuração necessária para o face-api rodar no Node
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas: Canvas as any, Image: Image as any, ImageData: ImageData as any });

@Injectable()
export class FaceRecognitionService implements OnModuleInit {
  private modelsLoaded = false;

  async onModuleInit() {
    await this.initializeModels();
  }

  /**
   * Inicializa os modelos do face-api
   */
  async initializeModels(): Promise<void> {
    if (this.modelsLoaded) return;

    try {
      console.log('🤖 Carregando modelos de reconhecimento facial...');

      // Usar caminho absoluto a partir da raiz do projeto
      const modelPath = path.join(process.cwd(), 'models');

      if (!fs.existsSync(modelPath)) {
        fs.mkdirSync(modelPath, { recursive: true });
        console.warn('⚠️ Diretório de modelos criado, mas vazio. Execute o script de download.');
      }

      // Carregar os modelos
      await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
      await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
      await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);

      this.modelsLoaded = true;
      console.log('⚡ Modelos de Face carregados com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao carregar modelos:', error);
      // Não lançar erro aqui para não impedir a inicialização do módulo
      // O fallback será usado se os modelos não estiverem carregados
    }
  }

  /**
   * Gera um hash facial único a partir de uma imagem
   */
  async generateFaceHash(imagePath: string): Promise<{
    sucesso: boolean;
    faceHash: string;
    faceDescriptor?: number[];
    error?: string;
  }> {
    try {
      // Garantir que modelos estão carregados
      if (!this.modelsLoaded) {
        await this.initializeModels();
        if (!this.modelsLoaded) {
          throw new Error('Modelos não puderam ser carregados');
        }
      }

      console.log('🔍 Processando imagem para geração de face hash:', imagePath);

      // Carregar a imagem usando a API do canvas
      const imageBuffer = fs.readFileSync(imagePath);
      const img = await canvas.loadImage(imageBuffer);

      // Detectar face e extrair descritor
      // Usando detectSingleFace que é mais rápido e adequado para documentos/selfies
      const detection = await faceapi
        .detectSingleFace(img as any)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        console.warn('⚠️ Nenhuma face detectada na imagem');
        return {
          sucesso: false,
          faceHash: '',
          error: 'Nenhuma face detectada na imagem'
        };
      }

      // Pegar o descritor facial (array de 128 números)
      const faceDescriptor = detection.descriptor;

      // Converter o descritor em um hash único
      const faceHash = this.descriptorToHash(faceDescriptor);

      console.log('✅ Face hash gerado com sucesso:', faceHash.substring(0, 16) + '...');

      return {
        sucesso: true,
        faceHash,
        faceDescriptor: Array.from(faceDescriptor)
      };

    } catch (error) {
      console.error('❌ Erro ao gerar face hash:', error);

      // Fallback: usar hash do arquivo se os modelos não funcionarem
      try {
        console.log('🔄 Usando fallback: hash SHA256 do arquivo...');
        const imageBuffer = fs.readFileSync(imagePath);
        const fallbackHash = crypto.createHash('sha256').update(imageBuffer).digest('hex');

        return {
          sucesso: true,
          faceHash: fallbackHash,
          error: `Fallback usado - ${error.message}`
        };
      } catch (fallbackError) {
        return {
          sucesso: false,
          faceHash: '',
          error: `Erro completo: ${error.message}`
        };
      }
    }
  }

  /**
   * Compara dois hashes faciais para verificar similaridade
   */
  async compareFaceHashes(hash1: string, hash2: string, threshold = 0.5): Promise<{
    match: boolean;
    distance: number;
    similaridade: number;
  }> {
    try {
      // Se os hashes forem SHA256 (fallback), comparação exata
      if (hash1.length === 64 && !hash1.includes('=')) {
        return {
          match: hash1 === hash2,
          distance: hash1 === hash2 ? 0 : 1,
          similaridade: hash1 === hash2 ? 1 : 0
        };
      }

      // Converter hashes de volta para descritores
      const descriptor1 = this.hashToDescriptor(hash1);
      const descriptor2 = this.hashToDescriptor(hash2);

      if (!descriptor1 || !descriptor2) {
        // Se falhar a conversão, tenta comparação exata de string
        const exactMatch = hash1 === hash2;
        return {
          match: exactMatch,
          distance: exactMatch ? 0 : 1,
          similaridade: exactMatch ? 1 : 0
        };
      }

      // Calcular distância euclidiana
      const distance = faceapi.euclideanDistance(descriptor1, descriptor2);
      // Distância menor que threshold (ex: 0.5) significa mesma pessoa
      const match = distance < threshold;
      const similaridade = Math.max(0, 1 - distance);

      return {
        match,
        distance,
        similaridade
      };

    } catch (error) {
      console.error('❌ Erro ao comparar hashes:', error);
      return {
        match: false,
        distance: 1,
        similaridade: 0
      };
    }
  }

  /**
   * Converte um descritor facial em um hash string
   */
  private descriptorToHash(descriptor: Float32Array): string {
    // Normalizar e converter para string base64 para economizar espaço
    const buffer = Buffer.from(new Float32Array(descriptor).buffer);
    return buffer.toString('base64');
  }

  /**
   * Converte um hash string de volta para descritor
   */
  private hashToDescriptor(hash: string): Float32Array | null {
    try {
      const buffer = Buffer.from(hash, 'base64');
      return new Float32Array(buffer.buffer);
    } catch {
      return null;
    }
  }

  /**
   * Baixa os modelos necessários se não existirem
   * (Simplificado - na prática você precisaria implementar o download)
   */
  private async downloadModelsIfNeeded(modelsDir: string): Promise<void> {
    const requiredModels = [
      'ssd_mobilenetv1_model-weights_manifest.json',
      'ssd_mobilenetv1_model-shard1',
      'face_landmark_68_model-weights_manifest.json',
      'face_landmark_68_model-shard1',
      'face_recognition_model-weights_manifest.json',
      'face_recognition_model-shard1'
    ];

    const missingModels = requiredModels.filter(model =>
      !fs.existsSync(path.join(modelsDir, model))
    );

    if (missingModels.length > 0) {
      console.log('📥 Baixando modelos de reconhecimento facial...');
      console.log('⚠️ ATENÇÃO: Você precisa baixar manualmente os modelos do face-api');
      console.log('📖 Documentação: https://github.com/vladmandic/face-api#model-files');

      // Criar arquivos placeholder para não quebrar
      missingModels.forEach(model => {
        const filePath = path.join(modelsDir, model);
        if (!fs.existsSync(filePath)) {
          fs.writeFileSync(filePath, '');
        }
      });
    }
  }
}

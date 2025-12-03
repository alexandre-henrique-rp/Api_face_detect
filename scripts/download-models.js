#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

const modelsDir = path.join(__dirname, '../models');

// Criar diretório de modelos
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
  console.log('📁 Diretório models criado');
}

// URLs dos modelos do face-api (Repositório original via raw)
const modelFiles = [
  {
    name: 'ssd_mobilenetv1_model-weights_manifest.json',
    url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/ssd_mobilenetv1_model-weights_manifest.json',
  },
  {
    name: 'ssd_mobilenetv1_model-shard1',
    url: 'https://media.githubusercontent.com/media/justadudewhohacks/face-api.js/master/weights/ssd_mobilenetv1_model-shard1',
  },
  {
    name: 'ssd_mobilenetv1_model-shard2',
    url: 'https://media.githubusercontent.com/media/justadudewhohacks/face-api.js/master/weights/ssd_mobilenetv1_model-shard2',
  },
  {
    name: 'face_landmark_68_model-weights_manifest.json',
    url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json',
  },
  {
    name: 'face_landmark_68_model-shard1',
    url: 'https://media.githubusercontent.com/media/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-shard1',
  },
  {
    name: 'face_recognition_model-weights_manifest.json',
    url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-weights_manifest.json',
  },
  {
    name: 'face_recognition_model-shard1',
    url: 'https://media.githubusercontent.com/media/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard1',
  },
  {
    name: 'face_recognition_model-shard2',
    url: 'https://media.githubusercontent.com/media/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard2',
  },
];

function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    console.log(`⬇️ Baixando ${path.basename(filePath)}...`);
    const file = fs.createWriteStream(filePath);

    https
      .get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // Seguir redirecionamento
          https
            .get(response.headers.location, (redirectResponse) => {
              if (redirectResponse.statusCode !== 200) {
                reject(
                  new Error(
                    `Falha no download: Status ${redirectResponse.statusCode}`,
                  ),
                );
                return;
              }
              redirectResponse.pipe(file);
              file.on('finish', () => {
                file.close();
                console.log(`✅ ${path.basename(filePath)} baixado.`);
                resolve();
              });
            })
            .on('error', reject);
        } else if (response.statusCode !== 200) {
          reject(new Error(`Falha no download: Status ${response.statusCode}`));
        } else {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log(`✅ ${path.basename(filePath)} baixado.`);
            resolve();
          });
        }
      })
      .on('error', reject);
  });
}

async function downloadModels() {
  console.log('📥 Iniciando download dos modelos do face-api...');

  // Limpar arquivos existentes se estiverem corrompidos (opcional, mas recomendado se houve erro)
  // fs.rmSync(modelsDir, { recursive: true, force: true });
  // fs.mkdirSync(modelsDir, { recursive: true });

  for (const model of modelFiles) {
    const filePath = path.join(modelsDir, model.name);

    // Forçar download para garantir integridade
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    try {
      await downloadFile(model.url, filePath);

      // Verificar se o arquivo não está vazio
      const stats = fs.statSync(filePath);
      if (stats.size < 100) {
        console.error(
          `❌ Arquivo ${model.name} parece muito pequeno (${stats.size} bytes). Pode estar corrompido.`,
        );
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error(`❌ Erro ao baixar ${model.name}:`, error.message);
    }
  }

  console.log('🎉 Todos os modelos foram baixados/verificados!');
}

downloadModels().catch(console.error);

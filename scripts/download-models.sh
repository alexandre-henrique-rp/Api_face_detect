#!/bin/bash

MODELS_DIR="models"
mkdir -p $MODELS_DIR

BASE_URL="https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"

FILES=(
  "ssd_mobilenetv1_model-weights_manifest.json"
  "ssd_mobilenetv1_model-shard1"
  "ssd_mobilenetv1_model-shard2"
  "face_landmark_68_model-weights_manifest.json"
  "face_landmark_68_model-shard1"
  "face_recognition_model-weights_manifest.json"
  "face_recognition_model-shard1"
  "face_recognition_model-shard2"
)

echo "📥 Baixando modelos..."

for file in "${FILES[@]}"; do
  if [ -f "$MODELS_DIR/$file" ]; then
    echo "✅ $file já existe"
  else
    echo "⬇️ Baixando $file..."
    curl -L -o "$MODELS_DIR/$file" "$BASE_URL/$file"
    if [ $? -eq 0 ]; then
      echo "✅ $file baixado com sucesso"
    else
      echo "❌ Falha ao baixar $file"
    fi
  fi
done

echo "🎉 Download concluído!"

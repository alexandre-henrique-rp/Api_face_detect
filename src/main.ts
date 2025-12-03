import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
import { AppModule } from './app.module';

const PORT = process.env.PORT || 3001;
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = new DocumentBuilder()
    .setTitle('API Face Detect Interface')
    .setDescription(`
# 📋 API Face Detect Interface - Documentação Completa

## 🔐 Como Utilizar a API

### 1. **Obtenção da API Key**
- **Contate o administrador** do sistema para solicitar seu cadastro
- Forneça seus dados de parceiro (CNPJ, razão social, etc.)
- O administrador criará seu usuário no sistema e fornecerá sua **API Key**
- A API Key corresponde ao campo **id_polo** da tabela \`parceiro_usuarios\`

### 2. **Como Usar a API Key**
- Adicione o header **x-api-key** em todas as requisições
- Exemplo: \`x-api-key: 12345\`
- Ou use o botão **"Authorize"** no Swagger UI (ícone de cadeado 🔒)

### 3. **Endpoints Disponíveis**
- **POST /upload** - Criar nova solicitação


### 8. **Contatos e Suporte**
- **📞 Suporte e Administração:** 
  - Telefone: [(16) 3289-7402](https://wa.me/551632897402)
  - Clique no número para abrir o WhatsApp
- **💬 WhatsApp:** atendimento rápido via mensagem
- **Para novas funcionalidades,** envie sugestões para o time de desenvolvimento

---

**⚠️ Importante:** Mantenha sua API Key em segurança e não compartilhe com terceiros!

**📱 Precisa de ajuda?** [Clique](https://wa.me/551632897402?text=Olá!%20Preciso%20de%20suporte%20com%20a%20API%20Parceiro%20ERP.%20Poderiam%20me%20ajudar?) no número acima e fale conosco via WhatsApp!
    `)
    .setVersion('1.0')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
        description: 'API Key para autenticação (fornecida pelo administrador após cadastro)'
      },
      'api_key'
    )
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, documentFactory);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Configuração para arquivos grandes
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));


  await app.listen(PORT).then(() => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`http://localhost:${PORT}`);
  });
}
bootstrap();

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
const Database = require('better-sqlite3');

// Carregar variáveis de ambiente
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Configuração do banco SQLite
let dbUrl = process.env.DATABASE_URL || 'file:./db/dev.db';
const dbPath = dbUrl.replace(/^file:/, '');
const absoluteDbPath = path.isAbsolute(dbPath) ? dbPath : path.resolve(__dirname, '..', dbPath);

console.log(`📂 Usando banco de dados em: ${absoluteDbPath}`);

if (!fs.existsSync(absoluteDbPath)) {
  console.error(`❌ Banco de dados não encontrado em ${absoluteDbPath}`);
  process.exit(1);
}

const db = new Database(absoluteDbPath);

function main() {
  const email = 'arinterface@gmail.com';

  // Verificar se já existe
  const stmt = db.prepare('SELECT * FROM user_adm WHERE email = ?');
  const existingAdmin = stmt.get(email);

  if (!existingAdmin) {
    // Criar ID UUID v4 (simulado ou usar biblioteca se disponível, mas sqlite tem randomblob)
    // Vamos usar crypto do node
    const crypto = require('crypto');
    const id = crypto.randomUUID();
    const now = new Date().toISOString(); // Prisma usa ISO string para DateTime no SQLite? Ou timestamp?
    // Prisma armazena DateTime como timestamp (milissegundos) ou string ISO?
    // Geralmente timestamp em milissegundos (BigInt) ou string dependendo da config.
    // No SQLite padrão do Prisma é timestamp (milliseconds since epoch).

    // Vamos verificar o schema gerado na migration se possível, mas o padrão é milissegundos.
    // Ops, DateTime @default(now()) no Prisma SQLite é epoch milliseconds (Integer/Real) ou Texto?
    // O padrão é timestamp numérico.

    // Vamos tentar inserir.
    const insert = db.prepare(`
      INSERT INTO user_adm (id, name, email, password, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    // timestamp em ms
    const timestamp = Date.now();

    try {
      insert.run(id, 'ADM', email, '1234', timestamp, timestamp);
      console.log('✅ Usuário administrador padrão criado com sucesso via SQL direto');
    } catch (e) {
      console.error('❌ Erro ao inserir admin:', e);
    }
  } else {
    console.log('ℹ️ Usuário administrador padrão já existe (verificado via SQL)');
  }
}

main();

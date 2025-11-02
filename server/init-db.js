const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Criar tabelas
db.serialize(() => {
    // Tabela de usuários
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL,
        nivel TEXT NOT NULL DEFAULT 'operador',
        ativo INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('Erro ao criar tabela usuarios:', err);
        } else {
            console.log('✓ Tabela usuarios criada');
        }
    });

    // Tabela de casos
    db.run(`CREATE TABLE IF NOT EXISTS casos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        status TEXT NOT NULL,
        descricao TEXT,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )`, (err) => {
        if (err) {
            console.error('Erro ao criar tabela casos:', err);
        } else {
            console.log('✓ Tabela casos criada');
        }
    });

    // Tabela de focos
    db.run(`CREATE TABLE IF NOT EXISTS focos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        tipo TEXT NOT NULL,
        origem TEXT DEFAULT 'vistoria',
        descricao TEXT,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )`, (err) => {
        if (err) {
            console.error('Erro ao criar tabela focos:', err);
        } else {
            console.log('✓ Tabela focos criada');
        }
    });

    // Tabela de áreas de risco
    db.run(`CREATE TABLE IF NOT EXISTS areas_risco (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        nivel TEXT NOT NULL,
        raio INTEGER DEFAULT 500,
        descricao TEXT,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )`, (err) => {
        if (err) {
            console.error('Erro ao criar tabela areas_risco:', err);
        } else {
            console.log('✓ Tabela areas_risco criada');
        }
    });

    // Tabela de notificações
    db.run(`CREATE TABLE IF NOT EXISTS notificacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT NOT NULL,
        titulo TEXT NOT NULL,
        mensagem TEXT,
        usuario_id INTEGER,
        lida INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )`, (err) => {
        if (err) {
            console.error('Erro ao criar tabela notificacoes:', err);
        } else {
            console.log('✓ Tabela notificacoes criada');
        }
    });

    // Criar usuário admin padrão
    const adminSenha = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO usuarios (nome, email, senha, nivel) 
            VALUES (?, ?, ?, ?)`, 
            ['Administrador', 'admin@dengue.local', adminSenha, 'admin'], (err) => {
        if (err) {
            console.error('Erro ao criar usuário admin:', err);
        } else {
            console.log('✓ Usuário admin criado (email: admin@dengue.local, senha: admin123)');
        }
    });

    // Criar usuário operador padrão
    const operadorSenha = bcrypt.hashSync('operador123', 10);
    db.run(`INSERT OR IGNORE INTO usuarios (nome, email, senha, nivel) 
            VALUES (?, ?, ?, ?)`, 
            ['Operador', 'operador@dengue.local', operadorSenha, 'operador'], (err) => {
        if (err) {
            console.error('Erro ao criar usuário operador:', err);
        } else {
            console.log('✓ Usuário operador criado (email: operador@dengue.local, senha: operador123)');
        }
    });

    console.log('\n✓ Banco de dados inicializado com sucesso!');
    console.log('\nUsuários padrão:');
    console.log('  Admin: admin@dengue.local / admin123');
    console.log('  Operador: operador@dengue.local / operador123\n');
});

db.close();

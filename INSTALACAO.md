# 📦 Guia de Instalação - Sistema de Mapeamento de Dengue

## Pré-requisitos

- Node.js (versão 14 ou superior)
- NPM (vem com Node.js)
- Navegador moderno

## Passo a Passo

### 1. Instalar Dependências do Backend

```bash
cd server
npm install
```

### 2. Inicializar Banco de Dados

```bash
npm run init-db
```

Isso criará:
- Banco de dados SQLite (`database.sqlite`)
- Tabelas necessárias
- Usuários padrão (admin e operador)

### 3. Configurar Variáveis de Ambiente (Opcional)

```bash
cp .env.example .env
```

Edite o arquivo `.env` se necessário:
- `PORT`: Porta do servidor (padrão: 3000)
- `JWT_SECRET`: Chave secreta para tokens (mude em produção!)
- `CORS_ORIGIN`: URL permitida para CORS

### 4. Iniciar o Servidor Backend

```bash
npm start
```

Ou em modo desenvolvimento (com auto-reload):
```bash
npm run dev
```

O servidor estará rodando em `http://localhost:3000`

### 5. Iniciar o Frontend

Opção 1: Abrir diretamente
- Abra `index.html` no navegador

Opção 2: Servidor local (recomendado)
```bash
# Python
python -m http.server 8000

# Node.js
npx http-server -p 8000

# PHP
php -S localhost:8000
```

Depois acesse: `http://localhost:8000`

### 6. Fazer Login

Use um dos usuários padrão:

**Administrador:**
- Email: `admin@dengue.local`
- Senha: `admin123`

**Operador:**
- Email: `operador@dengue.local`
- Senha: `operador123`

## 🔧 Verificação

1. Backend rodando: Acesse `http://localhost:3000/api/health`
   - Deve retornar: `{"status":"ok","timestamp":"..."}`

2. Frontend: Abra `http://localhost:8000`
   - Deve aparecer tela de login

3. Login: Use as credenciais acima
   - Deve entrar no sistema e ver o mapa

## ⚠️ Problemas Comuns

### CORS Error
- Certifique-se de que o backend está rodando
- Verifique a URL no arquivo `api.js` (deve ser `http://localhost:3000/api`)

### Erro ao carregar GeoJSON
- Certifique-se de que os arquivos `.geojson` estão na mesma pasta do `index.html`
- Use um servidor local (não abra o HTML diretamente)

### Porta já em uso
- Altere a porta no arquivo `server/config.js` ou `.env`

### Banco de dados não criado
- Execute: `cd server && npm run init-db`

## 📱 Estrutura de Diretórios

```
.
├── index.html          # Frontend principal
├── app.js             # JavaScript do frontend
├── api.js             # Cliente API
├── styles.css         # Estilos
├── server/            # Backend
│   ├── server.js      # Servidor principal
│   ├── routes/        # Rotas da API
│   ├── middleware/    # Middlewares
│   ├── config.js      # Configurações
│   └── init-db.js     # Script de inicialização
└── *.geojson          # Arquivos de dados geográficos
```

## 🚀 Pronto para Produção

1. Mude `JWT_SECRET` para uma chave forte
2. Configure HTTPS
3. Use um banco de dados mais robusto (PostgreSQL, MySQL)
4. Configure variáveis de ambiente corretamente
5. Adicione rate limiting
6. Configure backup do banco de dados

## 📞 Suporte

Em caso de problemas:
1. Verifique o console do navegador (F12)
2. Verifique os logs do servidor
3. Confirme que todas as dependências estão instaladas

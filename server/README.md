# Backend - Sistema de Mapeamento de Dengue

API REST para o Sistema de Mapeamento de Dengue com autenticação, notificações em tempo real e armazenamento de dados.

## 🚀 Instalação

1. Instale as dependências:
```bash
npm install
```

2. Inicialize o banco de dados:
```bash
npm run init-db
```

3. Configure as variáveis de ambiente (opcional):
```bash
cp .env.example .env
# Edite o arquivo .env conforme necessário
```

## ▶️ Executar

### Desenvolvimento (com nodemon):
```bash
npm run dev
```

### Produção:
```bash
npm start
```

O servidor estará disponível em `http://localhost:3000`

## 📋 Usuários Padrão

Após inicializar o banco de dados, os seguintes usuários estarão disponíveis:

- **Admin:**
  - Email: `admin@dengue.local`
  - Senha: `admin123`
  - Nível: `admin` (acesso total)

- **Operador:**
  - Email: `operador@dengue.local`
  - Senha: `operador123`
  - Nível: `operador` (pode criar e editar, mas não deletar)

## 🔐 Níveis de Acesso

- **admin**: Acesso total (criar, editar, deletar, gerenciar usuários)
- **operador**: Pode criar e editar dados, mas não pode deletar
- **visualizador**: Apenas leitura (não implementado ainda)

## 📡 Endpoints da API

### Autenticação
- `POST /api/auth/login` - Fazer login
- `POST /api/auth/register` - Registrar novo usuário (apenas admin)
- `GET /api/auth/verify` - Verificar token

### Casos de Dengue
- `GET /api/casos` - Listar casos
- `GET /api/casos/:id` - Obter caso por ID
- `POST /api/casos` - Criar caso
- `PUT /api/casos/:id` - Atualizar caso
- `DELETE /api/casos/:id` - Deletar caso (apenas admin)
- `GET /api/casos/stats/summary` - Estatísticas de casos

### Focos do Mosquito
- `GET /api/focos` - Listar focos
- `GET /api/focos/:id` - Obter foco por ID
- `POST /api/focos` - Criar foco
- `PUT /api/focos/:id` - Atualizar foco
- `DELETE /api/focos/:id` - Deletar foco (apenas admin)

### Áreas de Risco
- `GET /api/areas` - Listar áreas
- `GET /api/areas/:id` - Obter área por ID
- `POST /api/areas` - Criar área (gera notificação se alto risco)
- `PUT /api/areas/:id` - Atualizar área
- `DELETE /api/areas/:id` - Deletar área (apenas admin)

### Notificações
- `GET /api/notificacoes` - Listar notificações
- `PUT /api/notificacoes/:id/ler` - Marcar como lida
- `PUT /api/notificacoes/ler-todas` - Marcar todas como lidas
- `GET /api/notificacoes/contar/nao-lidas` - Contar não lidas

## 🔌 Socket.IO

O servidor suporta notificações em tempo real via Socket.IO na porta 3000.

Eventos:
- `nova_area_risco` - Emitido quando uma nova área de alto risco é criada

## 🗄️ Banco de Dados

O banco de dados SQLite é criado automaticamente em `database.sqlite`.

Estrutura:
- `usuarios` - Usuários do sistema
- `casos` - Casos de dengue
- `focos` - Focos do mosquito
- `areas_risco` - Áreas de risco
- `notificacoes` - Notificações do sistema

## 🔒 Segurança

- Senhas são hashadas com bcrypt
- Autenticação via JWT (JSON Web Tokens)
- Tokens expiram em 7 dias
- Validação de dados com express-validator
- CORS configurável

## 📝 Exemplo de Uso

### Login:
```javascript
fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@dengue.local',
    senha: 'admin123'
  })
})
.then(res => res.json())
.then(data => {
  const token = data.token;
  // Usar token nas próximas requisições
});
```

### Criar Caso:
```javascript
fetch('http://localhost:3000/api/casos', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    latitude: -19.81,
    longitude: -43.17,
    status: 'confirmado',
    descricao: 'Caso confirmado',
    data: '2024-01-15T10:30'
  })
});
```

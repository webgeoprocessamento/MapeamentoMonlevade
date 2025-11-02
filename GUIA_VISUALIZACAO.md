# 📱 Guia de Visualização do Aplicativo

## 🚀 Como Ver o Aplicativo Funcionando

### Pré-requisitos

1. **Node.js instalado** (versão 14 ou superior)
   - Verifique: `node --version`
   - Download: https://nodejs.org/

2. **Navegador moderno** (Chrome, Firefox, Edge, Safari)

### Passo 1: Iniciar o Backend

Abra um terminal e execute:

```bash
# Navegar até a pasta do servidor
cd server

# Instalar dependências (apenas na primeira vez)
npm install

# Inicializar banco de dados (apenas na primeira vez)
npm run init-db

# Iniciar o servidor
npm start
```

Você verá uma mensagem:
```
🚀 Servidor rodando na porta 3000
📡 API disponível em http://localhost:3000/api
```

**Mantenha este terminal aberto!**

### Passo 2: Iniciar o Frontend

Abra um **NOVO terminal** e execute:

**Opção A - Python:**
```bash
python -m http.server 8000
```

**Opção B - Node.js:**
```bash
npx http-server -p 8000
```

**Opção C - PHP:**
```bash
php -S localhost:8000
```

### Passo 3: Acessar no Navegador

1. Abra seu navegador
2. Acesse: `http://localhost:8000`
3. Você verá a **tela de login**

### Passo 4: Fazer Login

Use uma das credenciais padrão:

**👤 Administrador:**
- Email: `admin@dengue.local`
- Senha: `admin123`

**👤 Operador:**
- Email: `operador@dengue.local`
- Senha: `operador123`

### Passo 5: Explorar o Sistema

Após o login, você verá:

#### 🗺️ Mapa Interativo
- Zoom com mouse scroll
- Arrastar para navegar
- Clique em marcadores para ver detalhes

#### 📊 Menu Lateral (botão ☰ no canto superior esquerdo)

1. **Mapa** - Informações de zoom e escala
2. **Casos de Dengue** - Adicionar e gerenciar casos
3. **Focos do Mosquito** - Agora com 13 tipos detalhados!
4. **Áreas de Risco** - Identificar áreas problemáticas
5. **Camadas** - Mostrar/ocultar camadas GeoJSON
6. **Análise** - Heatmaps e clusters
7. **Relatórios** - Estatísticas e PDF

## 🎯 Funcionalidades Principais

### Adicionar Foco do Mosquito

1. Clique no menu ☰
2. Selecione "Focos do Mosquito"
3. Clique em "Adicionar Foco"
4. Escolha o tipo de foco (13 opções detalhadas):
   - **Depósitos Fixos e Elevados:**
     - Caixa d'água/Cisternas
     - Baldes/Tambores
     - Piscina Desativada
   - **Depósitos Móveis e Residuais:**
     - Pneus
     - Garrafas/Latas/Plásticos
     - Lixo a Céu Aberto/Entulho
     - Objetos em Desuso
   - **Depósitos Naturais ou Estruturais:**
     - Água Parada em Estruturas
     - Vasos de Plantas/Pratos
     - Bebedouros de Animais
     - Ralos e Caixas de Passagem
   - Outro

5. Preencha os dados e clique em "Salvar"

### Visualizar Heatmap

1. Menu → **Análise**
2. Marque "Heatmap de Casos"
3. Ajuste o raio se necessário
4. Veja áreas de concentração de casos

### Ver Clusters

1. Menu → **Análise**
2. Marque "Clusters de Marcadores"
3. Marcadores próximos serão agrupados

### Notificações

- Aparecem quando uma área de alto risco é criada
- Clique no ícone de sino no header
- Marque como lida ao visualizar

### Gerar Relatório PDF

1. Menu → **Relatórios**
2. Clique em "Gerar Relatório PDF"
3. PDF será baixado automaticamente

## 🔧 Resolução de Problemas

### ❌ "Cannot connect to API"
- Verifique se o backend está rodando na porta 3000
- Abra: `http://localhost:3000/api/health`
- Deve retornar: `{"status":"ok"}`

### ❌ GeoJSON não carrega
- Use um servidor local (não abra o HTML diretamente)
- Verifique se os arquivos `.geojson` estão na mesma pasta do `index.html`

### ❌ Erro de CORS
- Certifique-se de que o backend está rodando
- Verifique a URL em `api.js` (deve ser `http://localhost:3000/api`)

### ❌ Porta já em uso
- Backend: Altere em `server/config.js`
- Frontend: Use outra porta (ex: `python -m http.server 8001`)

## 📸 Estrutura Visual

```
┌─────────────────────────────────────────────────┐
│  Sistema de Mapeamento de Dengue                │
│  [Casos] [Focos] [Áreas] [🔔 2] [👤 Admin] [Sair]│
├─────────────────────────────────────────────────┤
│ [☰]                                            │
│                                                 │
│              🗺️ MAPA INTERATIVO                  │
│                                                 │
│         [Marcadores | Heatmap | Camadas]        │
│                                                 │
└─────────────────────────────────────────────────┘
```

## 🎨 Dicas de Uso

1. **Navegação Rápida:**
   - Clique em um item da lista para focar no mapa
   - Use zoom para ver detalhes

2. **Filtros:**
   - Use os filtros para encontrar tipos específicos
   - Filtre casos por status, focos por tipo, áreas por nível

3. **Adicionar Rápido:**
   - Clique diretamente no mapa para adicionar item naquela localização

4. **Visualização:**
   - Ative/desative camadas GeoJSON conforme necessário
   - Ajuste opacidade para melhor visualização

## 📞 Próximos Passos

Depois de visualizar:
1. Adicione alguns casos e focos de teste
2. Experimente os heatmaps e clusters
3. Gere um relatório PDF
4. Teste as notificações criando uma área de alto risco

---

**Sistema pronto para uso em produção após configuração adequada de segurança!**

# 🚀 Como Visualizar o Aplicativo

## Método 1: Script Automático (Recomendado)

### Windows:
1. **Duplo clique** em `iniciar.bat`
   - O script irá:
     - Verificar se o Node.js está instalado
     - Instalar dependências (se necessário)
     - Inicializar banco de dados (se necessário)
     - Iniciar backend e frontend
     - Abrir navegador automaticamente

2. **Aguarde** algumas janelas abrirem:
   - Janela 1: Backend (porta 3000) - **MANTENHA ABERTA**
   - Janela 2: Frontend (porta 8000) - **MANTENHA ABERTA**
   - Navegador: http://localhost:8000

## Método 2: Manual (Passo a Passo)

### Passo 1: Iniciar Backend

**Opção A - Usando o script:**
- Duplo clique em `iniciar-backend.bat`

**Opção B - Manual:**
```bash
cd server
npm install          # Apenas primeira vez
npm run init-db      # Apenas primeira vez
npm start
```

Você verá:
```
🚀 Servidor rodando na porta 3000
📡 API disponível em http://localhost:3000/api
```

**Mantenha esta janela aberta!**

### Passo 2: Iniciar Frontend (Nova Janela)

**Opção A - Usando o script:**
- Duplo clique em `iniciar-frontend.bat`

**Opção B - Manual:**

**Python:**
```bash
python -m http.server 8000
```

**PHP:**
```bash
php -S localhost:8000
```

**Node.js:**
```bash
npx http-server -p 8000
```

**Mantenha esta janela aberta também!**

### Passo 3: Abrir no Navegador

Abra seu navegador e acesse:
```
http://localhost:8000
```

## 📋 Login

Use uma das credenciais:

**Administrador:**
- Email: `admin@dengue.local`
- Senha: `admin123`

**Operador:**
- Email: `operador@dengue.local`
- Senha: `operador123`

## ✅ Verificação Rápida

### Backend está rodando?
Abra: http://localhost:3000/api/health
Deve retornar: `{"status":"ok","timestamp":"..."}`

### Frontend está rodando?
Abra: http://localhost:8000
Deve mostrar tela de login

## 🔧 Problemas Comuns

### ❌ "Node.js não encontrado"
**Solução:** Instale Node.js de https://nodejs.org/
- Escolha a versão LTS
- Durante instalação, marque "Add to PATH"

### ❌ "Porta 3000 já em uso"
**Solução:** 
- Feche outros programas usando a porta 3000
- Ou mude a porta em `server/config.js`

### ❌ "Porta 8000 já em uso"
**Solução:**
- Feche outros servidores na porta 8000
- Ou use outra porta: `python -m http.server 8001`

### ❌ "CORS Error" no navegador
**Solução:**
- Verifique se o backend está rodando na porta 3000
- Verifique o console do navegador (F12) para mais detalhes

### ❌ GeoJSON não carrega
**Solução:**
- Use um servidor HTTP local (não abra o HTML diretamente)
- Certifique-se de que os arquivos `.geojson` estão na mesma pasta

## 📱 Visualização no Celular (Rede Local)

Se quiser testar no celular:

1. Descubra o IP do seu computador:
   - Windows: `ipconfig` → Procure "IPv4"
   - Exemplo: `192.168.1.100`

2. No celular (mesma rede Wi-Fi):
   - Acesse: `http://192.168.1.100:8000`

## 🎯 Estrutura Visual Esperada

```
┌─────────────────────────────────────────┐
│ Sistema de Mapeamento de Dengue        │
│ [Casos] [Focos] [Áreas] [🔔] [👤]      │
├─────────────────────────────────────────┤
│ [☰]                                    │
│                                         │
│      🗺️ MAPA INTERATIVO                 │
│                                         │
│   [Marcadores | GeoJSON | Camadas]     │
│                                         │
└─────────────────────────────────────────┘
```

## 📝 Próximos Passos Após Visualizar

1. **Fazer Login** com as credenciais acima
2. **Explorar o Mapa** - Zoom, arrastar, clicar em marcadores
3. **Adicionar Focos** - Teste os 13 tipos disponíveis
4. **Adicionar Casos** - Marque casos de dengue
5. **Criar Áreas de Risco** - Identifique zonas problemáticas
6. **Ativar Heatmap** - Veja concentração de casos
7. **Gerar PDF** - Exporte relatórios

## 💡 Dicas

- **Duas janelas devem ficar abertas** (backend e frontend)
- **Não feche as janelas do terminal** enquanto usar o sistema
- **F12 no navegador** abre o console para debug
- **Clique no menu ☰** para ver todos os painéis

---

**Pronto! O aplicativo deve estar visualizável no navegador!** 🎉

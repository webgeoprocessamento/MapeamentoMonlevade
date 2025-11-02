# 🐛 Atualização: Sistema de Registro de Focos - Caça Dengue

## ✨ Melhorias Implementadas

### 1. **Nome do Aplicativo Atualizado**
- Nome alterado para **"Caça Dengue"** em toda a interface
- Ícone de bug no header

### 2. **Sistema de Registro Aprimorado**

#### **Duas Modalidades de Registro:**

1. **👨‍⚕️ Vistoria - Agente de Endemias**
   - Registro profissional durante inspeção
   - Identificado com badge azul

2. **👥 Denúncia Cidadã - Público Geral**
   - Cidadãos podem reportar focos encontrados
   - Identificado com badge verde

### 3. **Descrições Detalhadas dos Tipos de Foco**

Cada tipo agora inclui descrição completa:

#### **1. Depósitos Fixos e Elevados (Dificultam a limpeza)**

- **Caixa d'água/Cisternas**: Aberta, destampada ou com vedação incorreta
- **Baldes/Tambores**: Recipientes usados para armazenamento de água, destampados ou mal vedados
- **Piscina Desativada**: Piscina sem tratamento ou em desuso, com água acumulada

#### **2. Depósitos Móveis e Residuais (Pequenos e frequentemente ignorados)**

- **Pneus**: Acúmulo de água em pneus velhos e descartados
- **Garrafas/Latas/Plásticos**: Recipientes plásticos ou de vidro jogados ou armazenados de forma inadequada
- **Lixo a Céu Aberto/Entulho**: Acúmulo de lixo ou entulho que permite o acúmulo de água
- **Objetos em Desuso**: Brinquedos velhos, eletrodomésticos, sucatas que acumulam água

#### **3. Depósitos Naturais ou Estruturais**

- **Água Parada em Estruturas**: Calhas entupidas, lajes planas com acúmulo de água, ou partes da construção que não drenam corretamente
- **Vasos de Plantas/Pratos**: Acúmulo de água nos pratos ou dentro dos vasos (incluindo bromélias ou plantas que retêm água)
- **Bebedouros de Animais**: Recipientes de água de animais domésticos com troca infrequente
- **Ralos e Caixas de Passagem**: Ralos externos ou caixas de inspeção sem vedação ou com água acumulada

### 4. **Interface Melhorada**

- **Painel de Focos** com informações sobre os tipos de registro
- **Caixa de descrição** que aparece ao selecionar um tipo de foco
- **Filtros duplos**: por origem (vistoria/denúncia) e por tipo
- **Badges visuais** na lista de focos mostrando a origem do registro
- **Popup no mapa** mostra se é vistoria ou denúncia cidadã

### 5. **Banco de Dados Atualizado**

- Campo `origem` adicionado à tabela `focos`
- Valores: `vistoria` ou `denuncia`
- Migração automática para registros existentes

## 🎯 Como Usar

### Para Agente de Endemias:

1. Acesse "Focos do Mosquito"
2. Clique em "Registrar Novo Foco"
3. Selecione "Vistoria - Agente de Endemias"
4. Escolha o tipo de foco (veja descrição ao selecionar)
5. Preencha os dados e salve

### Para Cidadão (Denúncia):

1. Acesse "Focos do Mosquito"
2. Clique em "Registrar Novo Foco"
3. Selecione "Denúncia Cidadã - Público Geral"
4. Escolha o tipo de foco encontrado
5. Adicione descrição se necessário
6. Salve a denúncia

### Filtros Disponíveis:

- **Por Origem**: Filtrar apenas vistorias ou apenas denúncias
- **Por Tipo**: Filtrar por categoria específica de foco
- **Combinados**: Use ambos os filtros simultaneamente

## 📊 Visualizações

### No Mapa:
- Marcadores amarelos para todos os focos
- Popup mostra tipo, origem e data
- Ícones diferentes por tipo de foco

### Na Lista:
- Badges coloridos identificando origem
- Filtros rápidos por origem e tipo
- Informação completa de cada registro

## 🔄 Próximos Passos Sugeridos

1. Adicionar foto ao registro de foco
2. Sistema de priorização (focos críticos)
3. Relatórios por origem (vistoria vs denúncia)
4. Notificações para agentes sobre novas denúncias
5. Dashboard de estatísticas por tipo de origem

---

**Sistema atualizado e pronto para uso profissional!** 🎉

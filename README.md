# Sistema de Mapeamento de Dengue - GIS

Sistema de Informação Geográfica (GIS) web para mapeamento, monitoramento e gestão em tempo real de casos confirmados de dengue, focos do mosquito Aedes aegypti e áreas de alto risco.

## 🎯 Funcionalidades

### ✅ Implementadas

- **Mapa Base**: OpenStreetMap com controles de zoom e escala dinâmica
- **Camadas GeoJSON**: Visualização de Bairros, Drenagem, Estruturas Urbanas e Ruas
- **Casos de Dengue**: Adicionar, editar, excluir e filtrar casos por status
- **Focos do Mosquito**: Gerenciamento de focos do Aedes aegypti por tipo
- **Áreas de Risco**: Identificação de áreas de alto, médio e baixo risco
- **Controles de Camadas**: Ativar/desativar camadas e ajustar opacidade
- **Relatórios**: Estatísticas e visualizações dos dados coletados
- **Exportação**: Exportar dados em formato JSON
- **Interface Responsiva**: Design moderno e adaptável a diferentes dispositivos

## 📋 Requisitos

- Navegador moderno (Chrome, Firefox, Edge, Safari)
- Servidor web local (opcional, para desenvolvimento)
- Arquivos GeoJSON no mesmo diretório

## 🚀 Como Usar

### Opção 1: Abrir Diretamente (Recomendado)

1. Coloque todos os arquivos na mesma pasta:
   - `index.html`
   - `app.js`
   - `styles.css`
   - Arquivos GeoJSON (Bairros, Drenagem, Estruturas, Ruas)

2. Abra o arquivo `index.html` diretamente no navegador

### Opção 2: Usando Servidor Local

Para evitar problemas de CORS com arquivos GeoJSON, use um servidor local:

**Python:**
```bash
python -m http.server 8000
```

**Node.js:**
```bash
npx http-server
```

**PHP:**
```bash
php -S localhost:8000
```

Depois acesse: `http://localhost:8000`

## 📖 Guia de Uso

### Adicionar Caso de Dengue

1. Clique no botão de menu (☰) para abrir a sidebar
2. Navegue para "Casos de Dengue"
3. Clique em "Adicionar Caso"
4. Preencha o formulário:
   - Latitude e Longitude (ou clique no mapa)
   - Status (Confirmado, Suspeito, Descartado)
   - Descrição
   - Data
5. Clique em "Salvar"

### Adicionar Foco do Mosquito

1. Navegue para "Focos do Mosquito"
2. Clique em "Adicionar Foco"
3. Selecione o tipo de foco
4. Preencha as informações
5. Salve

### Criar Área de Risco

1. Navegue para "Áreas de Risco"
2. Clique em "Adicionar Área"
3. Defina o nível de risco
4. A área será exibida como um círculo no mapa

### Gerenciar Camadas

1. Navegue para "Camadas"
2. Marque/desmarque as camadas desejadas
3. Ajuste a opacidade com o slider

### Filtrar Dados

- Use os filtros nos painéis de Casos, Focos e Áreas
- Clique em um item na lista para focar no mapa

### Visualizar Relatórios

1. Navegue para "Relatórios"
2. Visualize estatísticas por categoria
3. Exporte os dados clicando em "Exportar Dados"

## 🗂️ Estrutura de Dados

Os dados são armazenados localmente no navegador usando `localStorage`:

- **Casos de Dengue**: `dengue_casos`
- **Focos**: `dengue_focos`
- **Áreas de Risco**: `dengue_areas`

Formato de um caso:
```json
{
  "id": "1234567890",
  "lat": -19.810000,
  "lng": -43.170000,
  "status": "confirmado",
  "descricao": "Caso confirmado na região central",
  "data": "2024-01-15T10:30",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🎨 Marcadores no Mapa

### Casos de Dengue
- 🔴 Vermelho: Confirmado
- 🟠 Laranja: Suspeito
- ⚪ Cinza: Descartado

### Focos do Mosquito
- 🟡 Amarelo: Diferentes ícones por tipo
  - 💧 Depósito de Água
  - 🍃 Vaso de Planta
  - ⭕ Pneu
  - 🗑️ Lixo
  - ⚠️ Outro

### Áreas de Risco
- 🔴 Vermelho: Alto Risco
- 🟠 Laranja: Médio Risco
- 🟡 Amarelo: Baixo Risco

## 🔧 Personalização

### Alterar Centro do Mapa

No arquivo `app.js`, linha ~25, ajuste as coordenadas:
```javascript
map = L.map('map', {
    center: [-19.81, -43.17], // [latitude, longitude]
    zoom: 13
});
```

### Alterar Cores

Edite o arquivo `styles.css` para personalizar cores:
- Header: gradiente roxo (`#667eea` para `#764ba2`)
- Botões: mesma paleta de cores

### Adicionar Mais Camadas GeoJSON

1. Adicione o arquivo GeoJSON na pasta
2. No `app.js`, função `loadGeoJsonLayers()`, adicione um novo `fetch()`
3. Adicione um checkbox no HTML (painel de camadas)

## 📱 Compatibilidade

- ✅ Desktop (Windows, Mac, Linux)
- ✅ Tablets
- ✅ Smartphones
- ✅ Navegadores modernos (Chrome, Firefox, Edge, Safari)

## 🔒 Privacidade

Todos os dados são armazenados **localmente** no navegador. Nenhuma informação é enviada para servidores externos.

Para backup, use a função "Exportar Dados" que gera um arquivo JSON.

## 🛠️ Tecnologias Utilizadas

- **Leaflet**: Biblioteca de mapas interativos
- **OpenStreetMap**: Mapas base
- **Font Awesome**: Ícones
- **HTML5/CSS3/JavaScript**: Frontend

## 📝 Licença

Este projeto é de uso livre para fins educacionais e de saúde pública.

## 🤝 Contribuições

Sugestões e melhorias são bem-vindas!

## 📞 Suporte

Para dúvidas ou problemas, verifique:
1. Console do navegador (F12) para erros
2. Se todos os arquivos estão na mesma pasta
3. Se o servidor local está rodando (se necessário)

---

**Desenvolvido para apoiar o combate à dengue e engajar a população na prevenção da doença.**

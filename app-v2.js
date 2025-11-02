// Importar API client
import { auth, casos, focos, areas, notificacoes } from './api.js';

// Configuração
const API_BASE_URL = 'http://localhost:3000';
let socket = null;
let currentUser = null;

// Inicialização do Mapa
let map;
let geoJsonLayers = {
    bairros: null,
    drenagem: null,
    estruturas: null,
    ruas: null
};

// Camadas
let marcadoresCasos = L.layerGroup();
let marcadoresFocos = L.layerGroup();
let marcadoresAreas = L.layerGroup();
let clusterCasos = null;
let clusterFocos = null;
let heatmapLayer = null;

// Dados
let dadosCasos = [];
let dadosFocos = [];
let dadosAreas = [];

// Verificar autenticação ao carregar
document.addEventListener('DOMContentLoaded', async function() {
    // Verificar se está autenticado
    if (auth.isAuthenticated()) {
        currentUser = auth.getCurrentUser();
        initApp();
    } else {
        showLogin();
    }
});

// Mostrar tela de login
function showLogin() {
    document.getElementById('modal-login').classList.add('active');
    document.getElementById('form-login').addEventListener('submit', handleLogin);
}

// Handler de login
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const senha = document.getElementById('login-senha').value;

    try {
        const data = await auth.login(email, senha);
        if (data) {
            currentUser = data.user;
            document.getElementById('modal-login').classList.remove('active');
            initApp();
        }
    } catch (error) {
        alert('Erro no login: ' + error.message);
    }
}

// Logout
window.logout = function() {
    auth.logout();
    location.reload();
};

// Inicializar aplicação
async function initApp() {
    // Mostrar informações do usuário
    if (currentUser) {
        document.getElementById('user-info').style.display = 'flex';
        document.getElementById('user-name').textContent = currentUser.nome;
    }

    // Conectar Socket.IO
    socket = io(API_BASE_URL);
    socket.on('nova_area_risco', handleNovaAreaRisco);

    initMap();
    initSidebar();
    initForms();
    loadGeoJsonLayers();
    await loadDadosFromAPI();
    updateStats();
    setupEventListeners();
    initHeatmap();
    initClusters();
    checkNotificacoes();
    setInterval(checkNotificacoes, 30000); // Verificar a cada 30s
}

// Inicializar Mapa
function initMap() {
    map = L.map('map', {
        center: [-19.81, -43.17],
        zoom: 13
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    L.control.scale({
        metric: true,
        imperial: false
    }).addTo(map);

    map.on('zoomend', updateZoomInfo);
    map.on('moveend', updateScale);
    updateZoomInfo();
    updateScale();
}

// Carregar camadas GeoJSON (mesmo código anterior)
function loadGeoJsonLayers() {
    const opacity = parseFloat(document.getElementById('opacity-slider').value);
    
    fetch('Bairros Plano Diretor.geojson')
        .then(response => response.json())
        .then(data => {
            geoJsonLayers.bairros = L.geoJSON(data, {
                style: {
                    color: '#667eea',
                    weight: 2,
                    opacity: opacity,
                    fillColor: '#667eea',
                    fillOpacity: opacity * 0.3
                },
                onEachFeature: function(feature, layer) {
                    if (feature.properties && feature.properties.Name) {
                        layer.bindPopup(`<strong>Bairro:</strong> ${feature.properties.Name}`);
                    }
                }
            });
            if (document.getElementById('layer-bairros').checked) {
                geoJsonLayers.bairros.addTo(map);
            }
        })
        .catch(err => console.error('Erro ao carregar Bairros:', err));

    fetch('Drenagem.geojson')
        .then(response => response.json())
        .then(data => {
            geoJsonLayers.drenagem = L.geoJSON(data, {
                style: {
                    color: '#00a8ff',
                    weight: 2,
                    opacity: opacity
                }
            });
            if (document.getElementById('layer-drenagem').checked) {
                geoJsonLayers.drenagem.addTo(map);
            }
        })
        .catch(err => console.error('Erro ao carregar Drenagem:', err));

    fetch('Estruturas Urbanas.geojson')
        .then(response => response.json())
        .then(data => {
            geoJsonLayers.estruturas = L.geoJSON(data, {
                style: {
                    color: '#e17055',
                    weight: 1,
                    opacity: opacity,
                    fillColor: '#e17055',
                    fillOpacity: opacity * 0.2
                }
            });
            if (document.getElementById('layer-estruturas').checked) {
                geoJsonLayers.estruturas.addTo(map);
            }
        })
        .catch(err => console.error('Erro ao carregar Estruturas:', err));

    fetch('Ruas.geojson')
        .then(response => response.json())
        .then(data => {
            geoJsonLayers.ruas = L.geoJSON(data, {
                style: {
                    color: '#6c757d',
                    weight: 1,
                    opacity: opacity
                }
            });
            if (document.getElementById('layer-ruas').checked) {
                geoJsonLayers.ruas.addTo(map);
            }
        })
        .catch(err => console.error('Erro ao carregar Ruas:', err));
}

// Carregar dados da API
async function loadDadosFromAPI() {
    try {
        dadosCasos = await casos.list() || [];
        dadosFocos = await focos.list() || [];
        dadosAreas = await areas.list() || [];
        renderMapData();
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        // Fallback para localStorage se API não disponível
        loadDadosLocal();
    }
}

// Renderizar dados no mapa
function renderMapData() {
    // Limpar camadas
    map.removeLayer(marcadoresCasos);
    map.removeLayer(marcadoresFocos);
    map.removeLayer(marcadoresAreas);
    if (clusterCasos) map.removeLayer(clusterCasos);
    if (clusterFocos) map.removeLayer(clusterFocos);
    if (heatmapLayer) map.removeLayer(heatmapLayer);

    marcadoresCasos = L.layerGroup();
    marcadoresFocos = L.layerGroup();
    marcadoresAreas = L.layerGroup();

    // Criar clusters
    clusterCasos = L.markerClusterGroup();
    clusterFocos = L.markerClusterGroup();

    // Adicionar casos
    dadosCasos.forEach(caso => {
        const statusColors = {
            'confirmado': 'red',
            'suspeito': 'orange',
            'descartado': 'gray'
        };
        const icon = L.AwesomeMarkers.icon({
            icon: 'virus',
            markerColor: statusColors[caso.status] || 'red',
            prefix: 'fas'
        });
        const marker = L.marker([caso.latitude, caso.longitude], { icon })
            .bindPopup(`<h4>Casos de Dengue</h4>
                <p><strong>Status:</strong> ${caso.status}</p>
                <p><strong>Data:</strong> ${formatDate(caso.data)}</p>
                <p>${caso.descricao || ''}</p>`)
            .on('click', () => map.setView([caso.latitude, caso.longitude], 16));
        
        clusterCasos.addLayer(marker);
        marcadoresCasos.addLayer(marker);
    });

    // Adicionar focos
    dadosFocos.forEach(foco => {
        const tipoIcons = {
            'deposito-agua': 'tint',
            'vaso-planta': 'leaf',
            'pneu': 'circle',
            'lixo': 'trash',
            'outro': 'exclamation-triangle'
        };
        const icon = L.AwesomeMarkers.icon({
            icon: tipoIcons[foco.tipo] || 'bug',
            markerColor: 'yellow',
            prefix: 'fas'
        });
        const marker = L.marker([foco.latitude, foco.longitude], { icon })
            .bindPopup(`<h4>Foco do Mosquito</h4>
                <p><strong>Tipo:</strong> ${formatTipoFoco(foco.tipo)}</p>
                <p><strong>Data:</strong> ${formatDate(foco.data)}</p>`)
            .on('click', () => map.setView([foco.latitude, foco.longitude], 16));
        
        clusterFocos.addLayer(marker);
        marcadoresFocos.addLayer(marker);
    });

    // Adicionar áreas
    dadosAreas.forEach(area => {
        const nivelColors = {
            'alto': 'red',
            'medio': 'orange',
            'baixo': 'yellow'
        };
        const circle = L.circle([area.latitude, area.longitude], {
            radius: area.raio || 500,
            color: nivelColors[area.nivel] || 'red',
            fillColor: nivelColors[area.nivel] || 'red',
            fillOpacity: 0.3,
            weight: 3
        })
        .bindPopup(`<h4>Área de Risco</h4>
            <p><strong>Nível:</strong> ${formatNivelRisco(area.nivel)}</p>
            <p><strong>Data:</strong> ${formatDate(area.data)}</p>`)
        .on('click', () => map.setView([area.latitude, area.longitude], 15));
        
        marcadoresAreas.addLayer(circle);
    });

    // Adicionar ao mapa
    marcadoresCasos.addTo(map);
    marcadoresFocos.addTo(map);
    marcadoresAreas.addTo(map);
    
    updateHeatmap();
    updateClusters();
}

// Inicializar Heatmap
function initHeatmap() {
    const toggle = document.getElementById('toggle-heatmap');
    const options = document.getElementById('heatmap-options');
    
    toggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            options.style.display = 'block';
            updateHeatmap();
        } else {
            options.style.display = 'none';
            if (heatmapLayer) {
                map.removeLayer(heatmapLayer);
                heatmapLayer = null;
            }
        }
    });

    document.getElementById('heatmap-radius').addEventListener('input', (e) => {
        document.getElementById('heatmap-radius-value').textContent = e.target.value;
        if (heatmapLayer && document.getElementById('toggle-heatmap').checked) {
            updateHeatmap();
        }
    });
}

// Atualizar Heatmap
function updateHeatmap() {
    if (!document.getElementById('toggle-heatmap').checked) return;

    if (heatmapLayer) {
        map.removeLayer(heatmapLayer);
    }

    const pontos = dadosCasos
        .filter(c => c.status === 'confirmado')
        .map(c => [c.latitude, c.longitude, 1]);

    if (pontos.length > 0) {
        const radius = parseInt(document.getElementById('heatmap-radius').value);
        heatmapLayer = L.heatLayer(pontos, {
            radius: radius,
            blur: radius * 1.5,
            maxZoom: 17
        });
        heatmapLayer.addTo(map);
    }
}

// Inicializar Clusters
function initClusters() {
    const toggle = document.getElementById('toggle-clusters');
    
    toggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            if (clusterCasos) map.addLayer(clusterCasos);
            if (clusterFocos) map.addLayer(clusterFocos);
            marcadoresCasos.removeFrom(map);
            marcadoresFocos.removeFrom(map);
        } else {
            if (clusterCasos) map.removeLayer(clusterCasos);
            if (clusterFocos) map.removeLayer(clusterFocos);
            marcadoresCasos.addTo(map);
            marcadoresFocos.addTo(map);
        }
    });
}

// Atualizar Clusters
function updateClusters() {
    if (document.getElementById('toggle-clusters').checked) {
        if (clusterCasos && !map.hasLayer(clusterCasos)) {
            map.addLayer(clusterCasos);
            marcadoresCasos.removeFrom(map);
        }
        if (clusterFocos && !map.hasLayer(clusterFocos)) {
            map.addLayer(clusterFocos);
            marcadoresFocos.removeFrom(map);
        }
    }
}

// Inicializar Sidebar (mesmo código anterior com pequenas adaptações)
function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggleSidebar');
    const closeBtn = document.getElementById('closeSidebar');

    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    closeBtn.addEventListener('click', () => {
        sidebar.classList.remove('open');
    });

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const panel = btn.getAttribute('data-panel');
            switchPanel(panel);
        });
    });
}

// Switch Panel
function switchPanel(panelName) {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(panel => panel.classList.remove('active'));

    document.querySelector(`[data-panel="${panelName}"]`).classList.add('active');
    document.getElementById(`panel-${panelName}`).classList.add('active');

    if (panelName === 'casos') {
        renderCasos();
    } else if (panelName === 'focos') {
        renderFocos();
    } else if (panelName === 'areas') {
        renderAreas();
    } else if (panelName === 'relatorios') {
        updateRelatorios();
    }
}

// Inicializar Formulários
function initForms() {
    const modal = document.getElementById('modal-form');
    const form = document.getElementById('form-item');
    const closeModal = document.getElementById('closeModal');
    const cancelForm = document.getElementById('cancel-form');

    closeModal.addEventListener('click', () => {
        modal.classList.remove('active');
        form.reset();
    });

    cancelForm.addEventListener('click', () => {
        modal.classList.remove('active');
        form.reset();
    });

    form.addEventListener('submit', handleFormSubmit);

    document.getElementById('btn-adicionar-caso').addEventListener('click', () => {
        openForm('caso', null, map.getCenter());
    });

    document.getElementById('btn-adicionar-foco').addEventListener('click', () => {
        openForm('foco', null, map.getCenter());
    });

    document.getElementById('btn-adicionar-area').addEventListener('click', () => {
        openForm('area', null, map.getCenter());
    });

    map.on('click', function(e) {
        const activePanel = document.querySelector('.panel.active').id;
        if (activePanel === 'panel-casos' || activePanel === 'panel-focos' || activePanel === 'panel-areas') {
            const type = activePanel.replace('panel-', '');
            openForm(type, null, e.latlng);
        }
    });
}

// Open Form
function openForm(type, item, latlng) {
    const modal = document.getElementById('modal-form');
    const form = document.getElementById('form-item');
    const title = document.getElementById('modal-title');
    
    form.reset();
    document.getElementById('form-type').value = type;
    
    document.getElementById('form-group-status').style.display = type === 'caso' ? 'block' : 'none';
    document.getElementById('form-group-tipo').style.display = type === 'foco' ? 'block' : 'none';
    document.getElementById('form-group-nivel').style.display = type === 'area' ? 'block' : 'none';
    document.getElementById('form-group-descricao').style.display = 'block';

    document.getElementById('form-latitude').value = latlng.lat.toFixed(6);
    document.getElementById('form-longitude').value = latlng.lng.toFixed(6);

    const titles = {
        'caso': 'Adicionar Caso de Dengue',
        'foco': 'Adicionar Foco do Mosquito',
        'area': 'Adicionar Área de Risco'
    };
    title.textContent = item ? 'Editar Item' : titles[type];

    if (item) {
        document.getElementById('form-id').value = item.id;
        document.getElementById('form-descricao').value = item.descricao || '';
        document.getElementById('form-data').value = item.data || new Date().toISOString().slice(0, 16);
        if (type === 'caso') {
            document.getElementById('form-status').value = item.status || 'confirmado';
        } else if (type === 'foco') {
            document.getElementById('form-tipo').value = item.tipo || 'deposito-agua';
        } else if (type === 'area') {
            document.getElementById('form-nivel').value = item.nivel || 'alto';
        }
    } else {
        document.getElementById('form-data').value = new Date().toISOString().slice(0, 16);
    }

    modal.classList.add('active');
}

// Handle Form Submit
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const type = document.getElementById('form-type').value;
    const id = document.getElementById('form-id').value;
    const lat = parseFloat(document.getElementById('form-latitude').value);
    const lng = parseFloat(document.getElementById('form-longitude').value);
    const descricao = document.getElementById('form-descricao').value;
    const data = document.getElementById('form-data').value;

    const itemData = {
        latitude: lat,
        longitude: lng,
        descricao: descricao || null,
        data: data
    };

    try {
        if (type === 'caso') {
            itemData.status = document.getElementById('form-status').value;
            if (id) {
                await casos.update(id, itemData);
            } else {
                await casos.create(itemData);
            }
        } else if (type === 'foco') {
            itemData.tipo = document.getElementById('form-tipo').value;
            if (id) {
                await focos.update(id, itemData);
            } else {
                await focos.create(itemData);
            }
        } else if (type === 'area') {
            itemData.nivel = document.getElementById('form-nivel').value;
            itemData.raio = 500;
            if (id) {
                await areas.update(id, itemData);
            } else {
                await areas.create(itemData);
            }
        }

        await loadDadosFromAPI();
        updateStats();
        document.getElementById('modal-form').classList.remove('active');
        
        const activePanel = document.querySelector('.panel.active').id;
        if (activePanel === 'panel-casos') renderCasos();
        else if (activePanel === 'panel-focos') renderFocos();
        else if (activePanel === 'panel-areas') renderAreas();
    } catch (error) {
        alert('Erro ao salvar: ' + error.message);
    }
}

// Renderizar listas (adaptado para API)
function renderCasos(filterStatus = 'todos') {
    const container = document.getElementById('lista-casos');
    let casos = [...dadosCasos];
    
    if (filterStatus !== 'todos') {
        casos = casos.filter(c => c.status === filterStatus);
    }

    if (casos.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Nenhum caso encontrado.</p>';
        return;
    }

    container.innerHTML = casos.map(caso => `
        <div class="list-item" onclick="map.setView([${caso.latitude}, ${caso.longitude}], 16)">
            <div class="list-item-header">
                <span class="list-item-title">Caso de Dengue</span>
                <div class="list-item-actions">
                    <button class="btn-icon" onclick="event.stopPropagation(); editarItem('caso', '${caso.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${currentUser?.nivel === 'admin' ? `
                    <button class="btn-icon" onclick="event.stopPropagation(); deletarItem('caso', '${caso.id}')" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                    ` : ''}
                </div>
            </div>
            <div class="list-item-info">
                <strong>Status:</strong> ${caso.status}<br>
                <strong>Data:</strong> ${formatDate(caso.data)}<br>
                ${caso.descricao ? `<strong>Descrição:</strong> ${caso.descricao}` : ''}
            </div>
        </div>
    `).join('');
}

function renderFocos(filterTipo = 'todos') {
    const container = document.getElementById('lista-focos');
    let focos = [...dadosFocos];
    
    if (filterTipo !== 'todos') {
        focos = focos.filter(f => f.tipo === filterTipo);
    }

    if (focos.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Nenhum foco encontrado.</p>';
        return;
    }

    container.innerHTML = focos.map(foco => `
        <div class="list-item" onclick="map.setView([${foco.latitude}, ${foco.longitude}], 16)">
            <div class="list-item-header">
                <span class="list-item-title">Foco do Mosquito</span>
                <div class="list-item-actions">
                    <button class="btn-icon" onclick="event.stopPropagation(); editarItem('foco', '${foco.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${currentUser?.nivel === 'admin' ? `
                    <button class="btn-icon" onclick="event.stopPropagation(); deletarItem('foco', '${foco.id}')" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                    ` : ''}
                </div>
            </div>
            <div class="list-item-info">
                <strong>Tipo:</strong> ${formatTipoFoco(foco.tipo)}<br>
                <strong>Data:</strong> ${formatDate(foco.data)}<br>
            </div>
        </div>
    `).join('');
}

function renderAreas(filterNivel = 'todos') {
    const container = document.getElementById('lista-areas');
    let areas = [...dadosAreas];
    
    if (filterNivel !== 'todos') {
        areas = areas.filter(a => a.nivel === filterNivel);
    }

    if (areas.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Nenhuma área encontrada.</p>';
        return;
    }

    container.innerHTML = areas.map(area => `
        <div class="list-item" onclick="map.setView([${area.latitude}, ${area.longitude}], 15)">
            <div class="list-item-header">
                <span class="list-item-title">Área de Risco</span>
                <div class="list-item-actions">
                    <button class="btn-icon" onclick="event.stopPropagation(); editarItem('area', '${area.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${currentUser?.nivel === 'admin' ? `
                    <button class="btn-icon" onclick="event.stopPropagation(); deletarItem('area', '${area.id}')" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                    ` : ''}
                </div>
            </div>
            <div class="list-item-info">
                <strong>Nível:</strong> ${formatNivelRisco(area.nivel)}<br>
                <strong>Data:</strong> ${formatDate(area.data)}<br>
            </div>
        </div>
    `).join('');
}

// Editar Item
window.editarItem = function(type, id) {
    let item;
    if (type === 'caso') {
        item = dadosCasos.find(c => c.id == id);
    } else if (type === 'foco') {
        item = dadosFocos.find(f => f.id == id);
    } else if (type === 'area') {
        item = dadosAreas.find(a => a.id == id);
    }

    if (item) {
        openForm(type, item, { lat: item.latitude, lng: item.longitude });
    }
};

// Deletar Item
window.deletarItem = async function(type, id) {
    if (!confirm('Tem certeza que deseja excluir este item?')) return;

    try {
        if (type === 'caso') {
            await casos.delete(id);
        } else if (type === 'foco') {
            await focos.delete(id);
        } else if (type === 'area') {
            await areas.delete(id);
        }

        await loadDadosFromAPI();
        updateStats();
        
        const activePanel = document.querySelector('.panel.active').id;
        if (activePanel === 'panel-casos') renderCasos();
        else if (activePanel === 'panel-focos') renderFocos();
        else if (activePanel === 'panel-areas') renderAreas();
    } catch (error) {
        alert('Erro ao excluir: ' + error.message);
    }
};

// Atualizar Estatísticas
function updateStats() {
    document.getElementById('total-casos').textContent = dadosCasos.length;
    document.getElementById('total-focos').textContent = dadosFocos.length;
    document.getElementById('total-areas-risco').textContent = dadosAreas.length;
}

// Atualizar Relatórios
async function updateRelatorios() {
    const casosPorStatus = {};
    dadosCasos.forEach(c => {
        casosPorStatus[c.status] = (casosPorStatus[c.status] || 0) + 1;
    });
    let htmlCasos = '<ul style="list-style: none; padding: 0;">';
    Object.keys(casosPorStatus).forEach(status => {
        htmlCasos += `<li style="padding: 5px 0;"><strong>${status}:</strong> ${casosPorStatus[status]}</li>`;
    });
    htmlCasos += '</ul>';
    document.getElementById('chart-casos-status').innerHTML = htmlCasos || '<p>Sem dados</p>';

    const focosPorTipo = {};
    dadosFocos.forEach(f => {
        focosPorTipo[f.tipo] = (focosPorTipo[f.tipo] || 0) + 1;
    });
    let htmlFocos = '<ul style="list-style: none; padding: 0;">';
    Object.keys(focosPorTipo).forEach(tipo => {
        htmlFocos += `<li style="padding: 5px 0;"><strong>${formatTipoFoco(tipo)}:</strong> ${focosPorTipo[tipo]}</li>`;
    });
    htmlFocos += '</ul>';
    document.getElementById('chart-focos-tipo').innerHTML = htmlFocos || '<p>Sem dados</p>';

    const areasPorNivel = {};
    dadosAreas.forEach(a => {
        areasPorNivel[a.nivel] = (areasPorNivel[a.nivel] || 0) + 1;
    });
    let htmlAreas = '<ul style="list-style: none; padding: 0;">';
    Object.keys(areasPorNivel).forEach(nivel => {
        htmlAreas += `<li style="padding: 5px 0;"><strong>${formatNivelRisco(nivel)}:</strong> ${areasPorNivel[nivel]}</li>`;
    });
    htmlAreas += '</ul>';
    document.getElementById('chart-areas-risco').innerHTML = htmlAreas || '<p>Sem dados</p>';
}

// Notificações
async function checkNotificacoes() {
    try {
        const count = await notificacoes.contarNaoLidas();
        const total = count.total || 0;
        document.getElementById('notificacoes-count').textContent = total;
        
        if (total > 0) {
            document.getElementById('badge-notificacao').style.display = 'flex';
            document.getElementById('badge-notificacao').textContent = total > 99 ? '99+' : total;
        } else {
            document.getElementById('badge-notificacao').style.display = 'none';
        }
    } catch (error) {
        console.error('Erro ao verificar notificações:', error);
    }
}

window.abrirPainelNotificacoes = async function() {
    const modal = document.getElementById('modal-notificacoes');
    modal.classList.add('active');
    
    try {
        const notifs = await notificacoes.list();
        const container = document.getElementById('lista-notificacoes');
        
        if (notifs.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Nenhuma notificação.</p>';
            return;
        }

        container.innerHTML = notifs.map(n => `
            <div class="notificacao-item ${n.lida ? 'lida' : ''}" onclick="marcarNotificacaoLida(${n.id})">
                <div class="notificacao-item-header">
                    <span class="notificacao-item-titulo">${n.titulo}</span>
                    <span class="notificacao-item-data">${formatDate(n.created_at)}</span>
                </div>
                <div class="notificacao-item-mensagem">${n.mensagem || ''}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar notificações:', error);
    }
};

window.fecharNotificacoes = function() {
    document.getElementById('modal-notificacoes').classList.remove('active');
};

window.marcarNotificacaoLida = async function(id) {
    try {
        await notificacoes.marcarLida(id);
        await checkNotificacoes();
        await window.abrirPainelNotificacoes();
    } catch (error) {
        console.error('Erro ao marcar notificação:', error);
    }
};

window.marcarTodasNotificacoesLidas = async function() {
    try {
        await notificacoes.marcarTodasLidas();
        await checkNotificacoes();
        await window.abrirPainelNotificacoes();
    } catch (error) {
        console.error('Erro ao marcar notificações:', error);
    }
};

// Handler de nova área de risco
function handleNovaAreaRisco(data) {
    checkNotificacoes();
    // Opcional: mostrar notificação visual
    if (Notification.permission === 'granted') {
        new Notification(data.titulo, {
            body: data.mensagem,
            icon: '/favicon.ico'
        });
    }
}

// Setup Event Listeners
function setupEventListeners() {
    document.getElementById('filter-status-casos').addEventListener('change', (e) => {
        renderCasos(e.target.value);
    });

    document.getElementById('filter-tipo-focos').addEventListener('change', (e) => {
        renderFocos(e.target.value);
    });

    document.getElementById('filter-nivel-areas').addEventListener('change', (e) => {
        renderAreas(e.target.value);
    });

    // Controles de camadas (mesmo código anterior)
    document.getElementById('layer-bairros').addEventListener('change', (e) => {
        if (e.target.checked) {
            geoJsonLayers.bairros.addTo(map);
        } else {
            map.removeLayer(geoJsonLayers.bairros);
        }
    });

    document.getElementById('layer-drenagem').addEventListener('change', (e) => {
        if (e.target.checked) {
            geoJsonLayers.drenagem.addTo(map);
        } else {
            map.removeLayer(geoJsonLayers.drenagem);
        }
    });

    document.getElementById('layer-estruturas').addEventListener('change', (e) => {
        if (e.target.checked) {
            geoJsonLayers.estruturas.addTo(map);
        } else {
            map.removeLayer(geoJsonLayers.estruturas);
        }
    });

    document.getElementById('layer-ruas').addEventListener('change', (e) => {
        if (e.target.checked) {
            geoJsonLayers.ruas.addTo(map);
        } else {
            map.removeLayer(geoJsonLayers.ruas);
        }
    });

    document.getElementById('opacity-slider').addEventListener('input', (e) => {
        const opacity = parseFloat(e.target.value);
        document.getElementById('opacity-value').textContent = Math.round(opacity * 100) + '%';
        
        Object.keys(geoJsonLayers).forEach(key => {
            if (geoJsonLayers[key]) {
                geoJsonLayers[key].setStyle({
                    opacity: opacity,
                    fillOpacity: opacity * 0.3
                });
            }
        });
    });

    // Exportar dados
    document.getElementById('btn-exportar-dados').addEventListener('click', () => {
        const dadosExport = {
            casos: dadosCasos,
            focos: dadosFocos,
            areas: dadosAreas,
            exportDate: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(dadosExport, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dengue-dados-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });

    // Gerar PDF
    document.getElementById('btn-gerar-pdf').addEventListener('click', gerarPDF);
}

// Gerar PDF
function gerarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('Relatório de Mapeamento de Dengue', 14, 22);
    
    doc.setFontSize(12);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);

    // Estatísticas
    let y = 40;
    doc.setFontSize(14);
    doc.text('Estatísticas Gerais', 14, y);
    y += 10;

    doc.setFontSize(10);
    doc.text(`Total de Casos: ${dadosCasos.length}`, 20, y);
    y += 6;
    doc.text(`Total de Focos: ${dadosFocos.length}`, 20, y);
    y += 6;
    doc.text(`Total de Áreas de Risco: ${dadosAreas.length}`, 20, y);
    y += 10;

    // Tabela de casos
    if (dadosCasos.length > 0) {
        doc.setFontSize(12);
        doc.text('Casos de Dengue', 14, y);
        y += 8;

        const casosTable = dadosCasos.slice(0, 20).map(c => [
            c.id,
            c.status,
            formatDate(c.data).split(' ')[0],
            c.latitude.toFixed(4),
            c.longitude.toFixed(4)
        ]);

        doc.autoTable({
            startY: y,
            head: [['ID', 'Status', 'Data', 'Latitude', 'Longitude']],
            body: casosTable,
            styles: { fontSize: 8 }
        });
        y = doc.lastAutoTable.finalY + 10;
    }

    // Nova página se necessário
    if (y > 250) {
        doc.addPage();
        y = 20;
    }

    // Tabela de focos
    if (dadosFocos.length > 0) {
        doc.setFontSize(12);
        doc.text('Focos do Mosquito', 14, y);
        y += 8;

        const focosTable = dadosFocos.slice(0, 20).map(f => [
            f.id,
            formatTipoFoco(f.tipo),
            formatDate(f.data).split(' ')[0],
            f.latitude.toFixed(4),
            f.longitude.toFixed(4)
        ]);

        doc.autoTable({
            startY: y,
            head: [['ID', 'Tipo', 'Data', 'Latitude', 'Longitude']],
            body: focosTable,
            styles: { fontSize: 8 }
        });
    }

    doc.save(`relatorio-dengue-${new Date().toISOString().split('T')[0]}.pdf`);
}

// Funções auxiliares
function updateZoomInfo() {
    const zoom = map.getZoom();
    document.getElementById('zoom-level').textContent = zoom;
}

function updateScale() {
    const bounds = map.getBounds();
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const latDiff = ne.lat - sw.lat;
    const distance = latDiff * 111;
    let scale = '';
    
    if (distance >= 1) {
        scale = distance.toFixed(1) + ' km';
    } else {
        scale = (distance * 1000).toFixed(0) + ' m';
    }
    
    document.getElementById('map-scale').textContent = scale;
}

function formatDate(dateString) {
    if (!dateString) return 'Não informada';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatTipoFoco(tipo) {
    const tipos = {
        'deposito-agua': 'Depósito de Água',
        'vaso-planta': 'Vaso de Planta',
        'pneu': 'Pneu',
        'lixo': 'Lixo',
        'outro': 'Outro'
    };
    return tipos[tipo] || tipo;
}

function formatNivelRisco(nivel) {
    const niveis = {
        'alto': 'Alto Risco',
        'medio': 'Médio Risco',
        'baixo': 'Baixo Risco'
    };
    return niveis[nivel] || nivel;
}

// Fallback para dados locais
function loadDadosLocal() {
    dadosCasos = JSON.parse(localStorage.getItem('dengue_casos') || '[]');
    dadosFocos = JSON.parse(localStorage.getItem('dengue_focos') || '[]');
    dadosAreas = JSON.parse(localStorage.getItem('dengue_areas') || '[]');
    renderMapData();
}

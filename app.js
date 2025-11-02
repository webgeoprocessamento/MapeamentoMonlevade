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

// Dados de endereços
let bairrosList = [];
let ruasList = [];
let ruasLayer = null; // Camada de ruas para interação

// Dados
let dadosCasos = [];
let dadosFocos = [];
let dadosAreas = [];

// Dados GeoJSON para busca
let dadosBairros = [];
let dadosRuas = [];

// Inicializar aplicação diretamente (login removido temporariamente)
document.addEventListener('DOMContentLoaded', async function() {
    // Criar usuário padrão sem autenticação
    currentUser = {
        id: 1,
        nome: 'Usuário Teste',
        email: 'teste@dengue.local',
        nivel: 'admin' // Dar permissões de admin para testes
    };
    
    // Esconder modal de login
    const modalLogin = document.getElementById('modal-login');
    if (modalLogin) {
        modalLogin.classList.remove('active');
    }
    
    initApp();
});

// Logout
window.logout = function() {
    auth.logout();
    location.reload();
};

// Abrir modal de seleção de foco
function abrirModalSelecaoFoco() {
    const modal = document.getElementById('modal-selecionar-foco');
    if (modal) {
        modal.classList.add('active');
    }
}

// Fechar modal de seleção de foco
window.fecharModalFoco = function() {
    const modal = document.getElementById('modal-selecionar-foco');
    if (modal) {
        modal.classList.remove('active');
        // Limpar seleções
        document.querySelectorAll('.tipo-foco-card-compact').forEach(c => c.classList.remove('selected'));
    }
};

// Inicializar aplicação
async function initApp() {
    // Mostrar informações do usuário
    if (currentUser) {
        const userInfo = document.getElementById('user-info');
        const userName = document.getElementById('user-name');
        if (userInfo) userInfo.style.display = 'flex';
        if (userName) userName.textContent = currentUser.nome || 'Usuário Teste';
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
    // checkNotificacoes(); // Desabilitado temporariamente sem autenticação
    // setInterval(checkNotificacoes, 30000); // Verificar a cada 30s
    
    // Solicitar permissão para notificações do navegador
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
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

// Carregar camadas GeoJSON
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
            dadosRuas = data.features || [];
            geoJsonLayers.ruas = L.geoJSON(data, {
                style: {
                    color: '#6c757d',
                    weight: 2,
                    opacity: opacity
                },
                onEachFeature: function(feature, layer) {
                    const props = feature.properties;
                    if (props && props.NM_LOG && props.NM_TIP_LOG) {
                        const nomeRua = `${props.NM_TIP_LOG} ${props.NM_LOG}`;
                        layer.bindPopup(`<strong>Rua:</strong> ${nomeRua}<br><small style="color: #666;">Clique para usar esta rua no formulário</small>`);
                        layer.on('click', function(e) {
                            const modalForm = document.getElementById('modal-form');
                            const isFormOpen = modalForm && modalForm.classList.contains('active');
                            const activePanel = document.querySelector('.panel.active')?.id;
                            
                            // Buscar coordenadas do ponto médio da linha
                            const coords = feature.geometry.coordinates;
                            let latlng = null;
                            if (coords && coords.length > 0) {
                                const midPoint = coords[Math.floor(coords.length / 2)];
                                latlng = { lat: midPoint[1], lng: midPoint[0] };
                            } else {
                                latlng = e.latlng;
                            }
                            
                            // Se o formulário estiver aberto, preencher automaticamente
                            if (isFormOpen) {
                                // Ativar aba de endereço
                                document.querySelectorAll('.localizacao-tab-btn').forEach(b => b.classList.remove('active'));
                                document.querySelectorAll('.localizacao-tab-content').forEach(c => {
                                    c.classList.remove('active');
                                    c.style.display = 'none';
                                });
                                document.getElementById('tab-loc-endereco').classList.add('active');
                                const enderecoContent = document.getElementById('content-loc-endereco');
                                enderecoContent.classList.add('active');
                                enderecoContent.style.display = 'block';
                                
                                // Preencher nome da rua
                                document.getElementById('form-rua').value = nomeRua;
                                
                                // Tentar identificar o bairro (verificar se a rua está dentro de algum bairro)
                                const clickLatLng = e.latlng;
                                let bairroEncontrado = null;
                                
                                if (dadosBairros.length > 0) {
                                    // Verificar se o ponto está dentro de algum bairro
                                    for (let bairro of dadosBairros) {
                                        if (bairro.geometry && bairro.geometry.coordinates) {
                                            const bairroCoords = bairro.geometry.coordinates[0][0];
                                            if (isPointInPolygon(clickLatLng, bairroCoords)) {
                                                bairroEncontrado = bairro.properties?.Name;
                                                break;
                                            }
                                        }
                                    }
                                    
                                    if (bairroEncontrado) {
                                        document.getElementById('form-bairro').value = bairroEncontrado;
                                    }
                                }
                                
                                // Atualizar coordenadas
                                document.getElementById('form-latitude').value = latlng.lat.toFixed(6);
                                document.getElementById('form-longitude').value = latlng.lng.toFixed(6);
                                map.setView([latlng.lat, latlng.lng], 18);
                                
                                // Adicionar marcador temporário
                                if (window.tempMarker) {
                                    map.removeLayer(window.tempMarker);
                                }
                                window.tempMarker = L.marker([latlng.lat, latlng.lng], {
                                    icon: L.AwesomeMarkers.icon({
                                        icon: 'map-marker-alt',
                                        markerColor: 'blue',
                                        prefix: 'fas'
                                    })
                                }).addTo(map);
                            } else {
                                // Se o formulário não estiver aberto, abrir formulário de foco se estiver na aba de focos
                                if (activePanel === 'panel-focos') {
                                    // Abrir modal de seleção primeiro
                                    abrirModalSelecaoFoco();
                                    // Guardar informações da rua para usar depois
                                    map._ruaSelecionada = {
                                        nome: nomeRua,
                                        latlng: latlng,
                                        clickLatLng: e.latlng
                                    };
                                } else {
                                    // Para outros casos, apenas mostrar popup
                                    layer.openPopup();
                                }
                            }
                        });
                    }
                }
            });
            if (document.getElementById('layer-ruas').checked) {
                geoJsonLayers.ruas.addTo(map);
            }
            // Popular lista de ruas no datalist
            popularListaRuas();
        })
        .catch(err => console.error('Erro ao carregar Ruas:', err));
    
    fetch('Bairros Plano Diretor.geojson')
        .then(response => response.json())
        .then(data => {
            dadosBairros = data.features || [];
            popularListaBairros();
        })
        .catch(err => console.error('Erro ao carregar Bairros:', err));
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
            // Depósitos Fixos e Elevados
            'caixa-dagua-cisterna': 'tint',
            'balde-tambor': 'flask',
            'piscina-desativada': 'water',
            // Depósitos Móveis e Residuais
            'pneu': 'circle',
            'garrafa-lata-plastico': 'recycle',
            'lixo-ceu-aberto': 'trash',
            'objetos-em-desuso': 'box',
            // Depósitos Naturais ou Estruturais
            'agua-parada-estrutura': 'building',
            'vaso-planta-prato': 'leaf',
            'bebedouro-animal': 'paw',
            'ralo-caixa-passagem': 'grip-lines-vertical',
            'outro': 'exclamation-triangle'
        };
        const icon = L.AwesomeMarkers.icon({
            icon: tipoIcons[foco.tipo] || 'bug',
            markerColor: 'yellow',
            prefix: 'fas'
        });
        const origemLabel = foco.origem === 'vistoria' ? '👨‍⚕️ Vistoria' : '👥 Denúncia Cidadã';
        const marker = L.marker([foco.latitude, foco.longitude], { icon })
            .bindPopup(`<h4>Foco do Mosquito</h4>
                <p><strong>Tipo:</strong> ${formatTipoFoco(foco.tipo)}</p>
                <p><strong>Origem:</strong> ${origemLabel}</p>
                <p><strong>Data:</strong> ${formatDate(foco.data)}</p>
                ${foco.descricao ? `<p><strong>Descrição:</strong> ${foco.descricao}</p>` : ''}`)
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

// Inicializar Sidebar
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
        renderFocos('todos', 'todos');
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

    // Botão flutuante para abrir modal de seleção de foco
    const btnFloatingFoco = document.getElementById('btn-floating-foco');
    const btnAbrirSelecao = document.getElementById('btn-abrir-selecao-foco');
    
    if (btnFloatingFoco) {
        btnFloatingFoco.addEventListener('click', abrirModalSelecaoFoco);
    }
    
    if (btnAbrirSelecao) {
        btnAbrirSelecao.addEventListener('click', abrirModalSelecaoFoco);
    }

    // Sistema de seleção de tipo de foco por cards no modal
    document.querySelectorAll('.tipo-foco-card-compact').forEach(card => {
        card.addEventListener('click', () => {
            const tipo = card.getAttribute('data-tipo');
            const origem = document.getElementById('selecao-origem-foco-modal').value;
            
            // Remover seleção anterior
            document.querySelectorAll('.tipo-foco-card-compact').forEach(c => c.classList.remove('selected'));
            
            // Marcar card selecionado
            card.classList.add('selected');
            
            // Fechar modal de seleção
            window.fecharModalFoco();
            
            // Usar posição do clique no mapa, rua selecionada, ou centro do mapa
            let latlng = map._clickLatLng || (map._ruaSelecionada ? map._ruaSelecionada.latlng : null) || map.getCenter();
            
            // Se foi selecionada uma rua, preparar dados de endereço
            let formData = {
                tipo: tipo,
                origem: origem
            };
            
            if (map._ruaSelecionada) {
                formData.rua = map._ruaSelecionada.nome;
                formData.clickLatLng = map._ruaSelecionada.clickLatLng;
            }
            
            // Limpar dados temporários
            delete map._clickLatLng;
            delete map._ruaSelecionada;
            
            // Abrir formulário com tipo pré-selecionado
            openForm('foco', null, latlng, formData);
        });
    });

    document.getElementById('btn-adicionar-area').addEventListener('click', () => {
        openForm('area', null, map.getCenter());
    });

    map.on('click', function(e) {
        const activePanel = document.querySelector('.panel.active')?.id;
        const modalForm = document.getElementById('modal-form');
        const isFormOpen = modalForm && modalForm.classList.contains('active');
        
        // Se o formulário estiver aberto, atualizar coordenadas
        if (isFormOpen) {
            document.getElementById('form-latitude').value = e.latlng.lat.toFixed(6);
            document.getElementById('form-longitude').value = e.latlng.lng.toFixed(6);
            // Remover marcador temporário se existir
            if (window.tempMarker) {
                map.removeLayer(window.tempMarker);
                window.tempMarker = null;
            }
        } else if (activePanel === 'panel-focos') {
            // Para focos, abrir modal de seleção primeiro
            abrirModalSelecaoFoco();
            // Guardar posição do clique para usar depois
            map._clickLatLng = e.latlng;
        } else if (activePanel === 'panel-casos' || activePanel === 'panel-areas') {
            const type = activePanel.replace('panel-', '');
            openForm(type, null, e.latlng);
        }
    });
    
    // Tabs de localização
    document.querySelectorAll('.localizacao-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.getAttribute('data-loc-tab');
            
            // Atualizar botões
            document.querySelectorAll('.localizacao-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Atualizar conteúdo
            document.querySelectorAll('.localizacao-tab-content').forEach(content => {
                content.classList.remove('active');
                content.style.display = 'none';
            });
            
            const targetContent = document.getElementById(`content-loc-${tabName}`);
            if (targetContent) {
                targetContent.classList.add('active');
                targetContent.style.display = 'block';
            }
        });
    });
    
    // Botão para usar posição atual do mapa
    const btnLocalizarMapa = document.getElementById('btn-localizar-no-mapa');
    if (btnLocalizarMapa) {
        btnLocalizarMapa.addEventListener('click', () => {
            const center = map.getCenter();
            document.getElementById('form-latitude').value = center.lat.toFixed(6);
            document.getElementById('form-longitude').value = center.lng.toFixed(6);
        });
    }
    
    // Botão para buscar endereço
    const btnBuscarEndereco = document.getElementById('btn-buscar-endereco');
    if (btnBuscarEndereco) {
        btnBuscarEndereco.addEventListener('click', buscarLocalizacaoPorEndereco);
    }
}

// Open Form
function openForm(type, item, latlng, prefillData = null) {
    const modal = document.getElementById('modal-form');
    const form = document.getElementById('form-item');
    const title = document.getElementById('modal-title');
    
    form.reset();
    document.getElementById('form-type').value = type;
    
    // Resetar tabs de localização para "Marcar no Mapa"
    document.querySelectorAll('.localizacao-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.localizacao-tab-content').forEach(c => {
        c.classList.remove('active');
        c.style.display = 'none';
    });
    document.getElementById('tab-loc-mapa').classList.add('active');
    document.getElementById('content-loc-mapa').classList.add('active');
    document.getElementById('content-loc-mapa').style.display = 'block';
    document.getElementById('endereco-resultado').style.display = 'none';
    
    // Remover marcador temporário se existir
    if (window.tempMarker) {
        map.removeLayer(window.tempMarker);
        window.tempMarker = null;
    }
    
    document.getElementById('form-group-status').style.display = type === 'caso' ? 'block' : 'none';
    document.getElementById('form-group-tipo').style.display = type === 'foco' ? 'block' : 'none';
    document.getElementById('form-group-origem').style.display = type === 'foco' ? 'block' : 'none';
    document.getElementById('form-group-nivel').style.display = type === 'area' ? 'block' : 'none';
    document.getElementById('form-group-descricao').style.display = 'block';
    document.getElementById('form-group-localizacao').style.display = 'block';

    document.getElementById('form-latitude').value = latlng.lat.toFixed(6);
    document.getElementById('form-longitude').value = latlng.lng.toFixed(6);

    const titles = {
        'caso': 'Adicionar Caso de Dengue',
        'foco': 'Registrar Foco do Mosquito',
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
            document.getElementById('form-tipo').value = item.tipo || 'caixa-dagua-cisterna';
            document.getElementById('form-origem').value = item.origem || 'vistoria';
            updateTipoDescricao();
        } else if (type === 'area') {
            document.getElementById('form-nivel').value = item.nivel || 'alto';
        }
    } else {
        document.getElementById('form-data').value = new Date().toISOString().slice(0, 16);
        if (type === 'foco') {
            // Usar dados pré-preenchidos se fornecidos (do card selecionado)
            if (prefillData) {
                document.getElementById('form-tipo').value = prefillData.tipo || 'caixa-dagua-cisterna';
                document.getElementById('form-origem').value = prefillData.origem || 'vistoria';
                
                // Se veio de uma rua selecionada, preencher endereço
                if (prefillData.rua) {
                    // Ativar aba de endereço
                    setTimeout(() => {
                        document.querySelectorAll('.localizacao-tab-btn').forEach(b => b.classList.remove('active'));
                        document.querySelectorAll('.localizacao-tab-content').forEach(c => {
                            c.classList.remove('active');
                            c.style.display = 'none';
                        });
                        document.getElementById('tab-loc-endereco').classList.add('active');
                        const enderecoContent = document.getElementById('content-loc-endereco');
                        enderecoContent.classList.add('active');
                        enderecoContent.style.display = 'block';
                        
                        // Preencher nome da rua
                        document.getElementById('form-rua').value = prefillData.rua;
                        
                        // Tentar identificar o bairro
                        if (prefillData.clickLatLng && dadosBairros.length > 0) {
                            for (let bairro of dadosBairros) {
                                if (bairro.geometry && bairro.geometry.coordinates) {
                                    const bairroCoords = bairro.geometry.coordinates[0][0];
                                    if (isPointInPolygon(prefillData.clickLatLng, bairroCoords)) {
                                        document.getElementById('form-bairro').value = bairro.properties?.Name;
                                        break;
                                    }
                                }
                            }
                        }
                    }, 100);
                }
            } else {
                document.getElementById('form-origem').value = 'vistoria';
            }
        }
    }

    // Atualizar descrição do tipo de foco quando mudar
    if (type === 'foco') {
        // Remover listeners anteriores para evitar duplicação
        const tipoSelect = document.getElementById('form-tipo');
        const newTipoSelect = tipoSelect.cloneNode(true);
        tipoSelect.parentNode.replaceChild(newTipoSelect, tipoSelect);
        
        newTipoSelect.addEventListener('change', updateTipoDescricao);
        updateTipoDescricao();
    }

    modal.classList.add('active');
    
    // Após abrir o modal, voltar para a aba de lista se necessário
    setTimeout(() => {
        const tabLista = document.getElementById('tab-lista-focos');
        if (tabLista && type === 'foco' && !tabLista.classList.contains('active') && !prefillData) {
            // Não mudar aba se veio da seleção de card
        }
    }, 100);
}

// Função para atualizar descrição do tipo de foco
function updateTipoDescricao() {
    const tipoSelect = document.getElementById('form-tipo');
    if (!tipoSelect) return;
    
    const selectedOption = tipoSelect.options[tipoSelect.selectedIndex];
    const descricao = selectedOption ? selectedOption.getAttribute('data-descricao') || '' : '';
    const descricaoBox = document.getElementById('tipo-descricao-box');
    const descricaoText = document.getElementById('tipo-descricao-text');
    
    if (descricaoBox && descricaoText) {
        if (descricao) {
            descricaoText.textContent = descricao;
            descricaoBox.style.display = 'block';
        } else {
            descricaoBox.style.display = 'none';
        }
    }
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
            itemData.origem = document.getElementById('form-origem').value;
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
        else if (activePanel === 'panel-focos') {
            const origem = document.getElementById('filter-origem-focos')?.value || 'todos';
            const tipo = document.getElementById('filter-tipo-focos')?.value || 'todos';
            renderFocos(tipo, origem);
        }
        else if (activePanel === 'panel-areas') renderAreas();
    } catch (error) {
        alert('Erro ao salvar: ' + error.message);
    }
}

// Renderizar listas
function renderCasos(filterStatus = 'todos') {
    const container = document.getElementById('lista-casos');
    let casosList = [...dadosCasos];
    
    if (filterStatus !== 'todos') {
        casosList = casosList.filter(c => c.status === filterStatus);
    }

    if (casosList.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Nenhum caso encontrado.</p>';
        return;
    }

    container.innerHTML = casosList.map(caso => `
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

function renderFocos(filterTipo = 'todos', filterOrigem = 'todos') {
    const container = document.getElementById('lista-focos');
    let focosList = [...dadosFocos];
    
    if (filterTipo !== 'todos') {
        focosList = focosList.filter(f => f.tipo === filterTipo);
    }
    
    if (filterOrigem !== 'todos') {
        focosList = focosList.filter(f => f.origem === filterOrigem);
    }

    if (focosList.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Nenhum foco encontrado.</p>';
        return;
    }

    container.innerHTML = focosList.map(foco => {
        const origemBadge = foco.origem === 'vistoria' 
            ? '<span style="background: #2196f3; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; margin-left: 8px;">👨‍⚕️ Vistoria</span>'
            : '<span style="background: #4caf50; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; margin-left: 8px;">👥 Denúncia</span>';
        
        return `
        <div class="list-item" onclick="map.setView([${foco.latitude}, ${foco.longitude}], 16)">
            <div class="list-item-header">
                <span class="list-item-title">Foco do Mosquito ${origemBadge}</span>
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
                <strong>${foco.origem === 'vistoria' ? 'Agente' : 'Cidadão'}:</strong> ${foco.origem === 'vistoria' ? 'Vistoria Profissional' : 'Denúncia Cidadã'}<br>
                <strong>Data:</strong> ${formatDate(foco.data)}<br>
                ${foco.descricao ? `<strong>Descrição:</strong> ${foco.descricao}<br>` : ''}
            </div>
        </div>
    `;
    }).join('');
}

function renderAreas(filterNivel = 'todos') {
    const container = document.getElementById('lista-areas');
    let areasList = [...dadosAreas];
    
    if (filterNivel !== 'todos') {
        areasList = areasList.filter(a => a.nivel === filterNivel);
    }

    if (areasList.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Nenhuma área encontrada.</p>';
        return;
    }

    container.innerHTML = areasList.map(area => `
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
        else if (activePanel === 'panel-focos') {
            const origem = document.getElementById('filter-origem-focos')?.value || 'todos';
            const tipo = document.getElementById('filter-tipo-focos')?.value || 'todos';
            renderFocos(tipo, origem);
        }
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
    
    // Atualizar badges de contagem nos painéis
    const countCasos = document.getElementById('count-casos');
    const countFocos = document.getElementById('count-focos');
    const countAreas = document.getElementById('count-areas');
    
    if (countCasos) countCasos.textContent = dadosCasos.length;
    if (countFocos) countFocos.textContent = dadosFocos.length;
    if (countAreas) countAreas.textContent = dadosAreas.length;
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
        const origem = document.getElementById('filter-origem-focos').value;
        renderFocos(e.target.value, origem);
    });
    
    document.getElementById('filter-origem-focos').addEventListener('change', (e) => {
        const tipo = document.getElementById('filter-tipo-focos').value;
        renderFocos(tipo, e.target.value);
    });

    document.getElementById('filter-nivel-areas').addEventListener('change', (e) => {
        renderAreas(e.target.value);
    });

    // Controles de camadas
    document.getElementById('layer-bairros').addEventListener('change', (e) => {
        if (e.target.checked && geoJsonLayers.bairros) {
            geoJsonLayers.bairros.addTo(map);
        } else if (geoJsonLayers.bairros) {
            map.removeLayer(geoJsonLayers.bairros);
        }
    });

    document.getElementById('layer-drenagem').addEventListener('change', (e) => {
        if (e.target.checked && geoJsonLayers.drenagem) {
            geoJsonLayers.drenagem.addTo(map);
        } else if (geoJsonLayers.drenagem) {
            map.removeLayer(geoJsonLayers.drenagem);
        }
    });

    document.getElementById('layer-estruturas').addEventListener('change', (e) => {
        if (e.target.checked && geoJsonLayers.estruturas) {
            geoJsonLayers.estruturas.addTo(map);
        } else if (geoJsonLayers.estruturas) {
            map.removeLayer(geoJsonLayers.estruturas);
        }
    });

    document.getElementById('layer-ruas').addEventListener('change', (e) => {
        if (e.target.checked && geoJsonLayers.ruas) {
            geoJsonLayers.ruas.addTo(map);
        } else if (geoJsonLayers.ruas) {
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

    if (y > 250) {
        doc.addPage();
        y = 20;
    }

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

// Função para buscar localização por endereço (geocodificação)
async function buscarLocalizacaoPorEndereco() {
    const bairro = document.getElementById('form-bairro').value;
    const rua = document.getElementById('form-rua').value;
    const numero = document.getElementById('form-numero').value;
    const resultadoDiv = document.getElementById('endereco-resultado');
    const btnBuscar = document.getElementById('btn-buscar-endereco');
    
    if (!rua && !bairro) {
        alert('Por favor, preencha pelo menos a rua ou o bairro.');
        return;
    }
    
    // Desabilitar botão durante busca
    btnBuscar.disabled = true;
    btnBuscar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando...';
    resultadoDiv.style.display = 'none';
    
    try {
        // Montar query de endereço
        let enderecoCompleto = '';
        if (numero) enderecoCompleto += numero + ', ';
        if (rua) enderecoCompleto += rua + ', ';
        if (bairro) enderecoCompleto += bairro + ', ';
        enderecoCompleto += 'João Monlevade, MG, Brasil';
        
        // Usar Nominatim (OpenStreetMap) para geocodificação
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(enderecoCompleto)}&limit=1&addressdetails=1`;
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Caça-Dengue/1.0' // Nominatim requer User-Agent
            }
        });
        
        if (!response.ok) {
            throw new Error('Erro na busca de endereço');
        }
        
        const data = await response.json();
        
        if (data && data.length > 0) {
            const resultado = data[0];
            const lat = parseFloat(resultado.lat);
            const lng = parseFloat(resultado.lon);
            
            // Atualizar campos de coordenadas
            document.getElementById('form-latitude').value = lat.toFixed(6);
            document.getElementById('form-longitude').value = lng.toFixed(6);
            
            // Atualizar display de resultado
            document.getElementById('endereco-lat').textContent = lat.toFixed(6);
            document.getElementById('endereco-lng').textContent = lng.toFixed(6);
            resultadoDiv.style.display = 'block';
            resultadoDiv.style.background = '#d4edda';
            resultadoDiv.style.borderLeft = '4px solid #28a745';
            
            // Centralizar mapa na localização encontrada
            map.setView([lat, lng], 18);
            
            // Adicionar marcador temporário
            if (window.tempMarker) {
                map.removeLayer(window.tempMarker);
            }
            window.tempMarker = L.marker([lat, lng], {
                icon: L.AwesomeMarkers.icon({
                    icon: 'map-marker-alt',
                    markerColor: 'green',
                    prefix: 'fas'
                })
            }).addTo(map);
            
        } else {
            // Tentar busca mais genérica (sem número)
            if (numero) {
                const enderecoSemNumero = (rua ? rua + ', ' : '') + (bairro ? bairro + ', ' : '') + 'João Monlevade, MG, Brasil';
                const url2 = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(enderecoSemNumero)}&limit=1`;
                const response2 = await fetch(url2, {
                    headers: {
                        'User-Agent': 'Caça-Dengue/1.0'
                    }
                });
                
                if (response2.ok) {
                    const data2 = await response2.json();
                    if (data2 && data2.length > 0) {
                        const resultado = data2[0];
                        const lat = parseFloat(resultado.lat);
                        const lng = parseFloat(resultado.lon);
                        document.getElementById('form-latitude').value = lat.toFixed(6);
                        document.getElementById('form-longitude').value = lng.toFixed(6);
                        document.getElementById('endereco-lat').textContent = lat.toFixed(6);
                        document.getElementById('endereco-lng').textContent = lng.toFixed(6);
                        resultadoDiv.style.display = 'block';
                        resultadoDiv.style.background = '#fff3cd';
                        resultadoDiv.style.borderLeft = '4px solid #ffc107';
                        resultadoDiv.innerHTML = `
                            <strong><i class="fas fa-exclamation-triangle" style="color: #ffc107;"></i> Localização aproximada encontrada (sem número):</strong>
                            <div style="margin-top: 5px; font-size: 0.85rem;">
                                <span id="endereco-lat">${lat.toFixed(6)}</span>, <span id="endereco-lng">${lng.toFixed(6)}</span>
                            </div>
                            <small style="color: #856404; display: block; margin-top: 5px;">O número não foi encontrado. Use o mapa para ajustar a localização exata.</small>
                        `;
                        map.setView([lat, lng], 16);
                        if (window.tempMarker) {
                            map.removeLayer(window.tempMarker);
                        }
                        window.tempMarker = L.marker([lat, lng], {
                            icon: L.AwesomeMarkers.icon({
                                icon: 'map-marker-alt',
                                markerColor: 'orange',
                                prefix: 'fas'
                            })
                        }).addTo(map);
                    } else {
                        throw new Error('Endereço não encontrado');
                    }
                } else {
                    throw new Error('Erro ao buscar endereço');
                }
            } else {
                throw new Error('Endereço não encontrado');
            }
        }
    } catch (error) {
        console.error('Erro na geocodificação:', error);
        resultadoDiv.style.display = 'block';
        resultadoDiv.style.background = '#f8d7da';
        resultadoDiv.style.borderLeft = '4px solid #dc3545';
        resultadoDiv.innerHTML = `
            <strong><i class="fas fa-times-circle" style="color: #dc3545;"></i> Erro ao buscar endereço:</strong>
            <div style="margin-top: 5px; font-size: 0.85rem;">${error.message}</div>
            <small style="color: #721c24; display: block; margin-top: 5px;">Tente usar o mapa para marcar a localização ou verifique o endereço digitado.</small>
        `;
    } finally {
        // Reabilitar botão
        btnBuscar.disabled = false;
        btnBuscar.innerHTML = '<i class="fas fa-search-location"></i> Buscar Localização no Mapa';
    }
}

// Popular lista de bairros
function popularListaBairros() {
    const selectBairro = document.getElementById('form-bairro');
    if (!selectBairro || dadosBairros.length === 0) return;
    
    // Limpar opções existentes (exceto a primeira)
    while (selectBairro.options.length > 1) {
        selectBairro.remove(1);
    }
    
    // Extrair nomes únicos de bairros
    const bairrosUnicos = [...new Set(dadosBairros
        .map(f => f.properties?.Name)
        .filter(Boolean)
        .sort()
    )];
    
    bairrosUnicos.forEach(nome => {
        const option = document.createElement('option');
        option.value = nome;
        option.textContent = nome;
        selectBairro.appendChild(option);
    });
}

// Popular lista de ruas no datalist
function popularListaRuas() {
    const datalist = document.getElementById('lista-ruas');
    if (!datalist || dadosRuas.length === 0) return;
    
    datalist.innerHTML = '';
    
    // Extrair nomes únicos de ruas
    const ruasUnicas = [...new Set(dadosRuas
        .map(f => {
            const props = f.properties;
            if (props && props.NM_LOG && props.NM_TIP_LOG) {
                return `${props.NM_TIP_LOG} ${props.NM_LOG}`;
            }
            return null;
        })
        .filter(Boolean)
        .sort()
    )];
    
    ruasUnicas.forEach(nome => {
        const option = document.createElement('option');
        option.value = nome;
        datalist.appendChild(option);
    });
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
        // Depósitos Fixos e Elevados
        'caixa-dagua-cisterna': 'Caixa d\'água/Cisternas',
        'balde-tambor': 'Baldes/Tambores',
        'piscina-desativada': 'Piscina Desativada',
        // Depósitos Móveis e Residuais
        'pneu': 'Pneus',
        'garrafa-lata-plastico': 'Garrafas/Latas/Plásticos',
        'lixo-ceu-aberto': 'Lixo a Céu Aberto/Entulho',
        'objetos-em-desuso': 'Objetos em Desuso',
        // Depósitos Naturais ou Estruturais
        'agua-parada-estrutura': 'Água Parada em Estruturas',
        'vaso-planta-prato': 'Vasos de Plantas/Pratos',
        'bebedouro-animal': 'Bebedouros de Animais',
        'ralo-caixa-passagem': 'Ralos e Caixas de Passagem',
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

// Função auxiliar para verificar se um ponto está dentro de um polígono
function isPointInPolygon(point, polygon) {
    let inside = false;
    const x = point.lng;
    const y = point.lat;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0], yi = polygon[i][1];
        const xj = polygon[j][0], yj = polygon[j][1];
        
        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    
    return inside;
}

// Fallback para dados locais
function loadDadosLocal() {
    dadosCasos = JSON.parse(localStorage.getItem('dengue_casos') || '[]');
    dadosFocos = JSON.parse(localStorage.getItem('dengue_focos') || '[]');
    dadosAreas = JSON.parse(localStorage.getItem('dengue_areas') || '[]');
    renderMapData();
}

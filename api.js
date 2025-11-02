// Configuração da API
const API_BASE_URL = 'http://localhost:3000/api';

// Função para fazer requisições autenticadas
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('auth_token');
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
    });

    if (response.status === 401) {
        // Token expirado ou inválido
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        window.location.href = '#login';
        return null;
    }

    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Erro na requisição');
    }

    return data;
}

// Autenticação
export const auth = {
    async login(email, senha) {
        const data = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, senha })
        });
        
        if (data && data.token) {
            localStorage.setItem('auth_token', data.token);
            localStorage.setItem('auth_user', JSON.stringify(data.user));
            return data;
        }
        return null;
    },

    async verify() {
        const data = await apiRequest('/auth/verify');
        return data;
    },

    logout() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
    },

    getCurrentUser() {
        const user = localStorage.getItem('auth_user');
        return user ? JSON.parse(user) : null;
    },

    isAuthenticated() {
        return !!localStorage.getItem('auth_token');
    }
};

// Casos
export const casos = {
    async list(filters = {}) {
        const params = new URLSearchParams(filters);
        return await apiRequest(`/casos?${params}`);
    },

    async get(id) {
        return await apiRequest(`/casos/${id}`);
    },

    async create(data) {
        return await apiRequest('/casos', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async update(id, data) {
        return await apiRequest(`/casos/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async delete(id) {
        return await apiRequest(`/casos/${id}`, {
            method: 'DELETE'
        });
    },

    async getStats() {
        return await apiRequest('/casos/stats/summary');
    }
};

// Focos
export const focos = {
    async list(filters = {}) {
        const params = new URLSearchParams(filters);
        return await apiRequest(`/focos?${params}`);
    },

    async get(id) {
        return await apiRequest(`/focos/${id}`);
    },

    async create(data) {
        return await apiRequest('/focos', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async update(id, data) {
        return await apiRequest(`/focos/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async delete(id) {
        return await apiRequest(`/focos/${id}`, {
            method: 'DELETE'
        });
    }
};

// Áreas de Risco
export const areas = {
    async list(filters = {}) {
        const params = new URLSearchParams(filters);
        return await apiRequest(`/areas?${params}`);
    },

    async get(id) {
        return await apiRequest(`/areas/${id}`);
    },

    async create(data) {
        return await apiRequest('/areas', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async update(id, data) {
        return await apiRequest(`/areas/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async delete(id) {
        return await apiRequest(`/areas/${id}`, {
            method: 'DELETE'
        });
    }
};

// Notificações
export const notificacoes = {
    async list(filters = {}) {
        const params = new URLSearchParams(filters);
        return await apiRequest(`/notificacoes?${params}`);
    },

    async marcarLida(id) {
        return await apiRequest(`/notificacoes/${id}/ler`, {
            method: 'PUT'
        });
    },

    async marcarTodasLidas() {
        return await apiRequest('/notificacoes/ler-todas', {
            method: 'PUT'
        });
    },

    async contarNaoLidas() {
        return await apiRequest('/notificacoes/contar/nao-lidas');
    }
};

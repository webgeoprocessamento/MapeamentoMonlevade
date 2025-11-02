const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const config = require('./config');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: config.corsOrigin,
        methods: ['GET', 'POST']
    }
});

// Armazenar io para uso nas rotas
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());

// Rotas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/casos', require('./routes/casos'));
app.use('/api/focos', require('./routes/focos'));
app.use('/api/areas', require('./routes/areas'));
app.use('/api/notificacoes', require('./routes/notificacoes'));

// Rota de saúde
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.IO - Notificações em tempo real
io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);

    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
    });
});

// Iniciar servidor
server.listen(config.port, () => {
    console.log(`\n🚀 Servidor rodando na porta ${config.port}`);
    console.log(`📡 API disponível em http://localhost:${config.port}/api`);
    console.log(`\nRotas disponíveis:`);
    console.log(`  POST /api/auth/login`);
    console.log(`  GET  /api/casos`);
    console.log(`  GET  /api/focos`);
    console.log(`  GET  /api/areas`);
    console.log(`  GET  /api/notificacoes`);
    console.log(`\n`);
});

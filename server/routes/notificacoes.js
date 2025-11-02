const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const { authenticate } = require('../middleware/auth');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

router.use(authenticate);

// Listar notificações do usuário
router.get('/', (req, res) => {
    const { lida } = req.query;
    
    let query = 'SELECT * FROM notificacoes WHERE usuario_id IS NULL OR usuario_id = ?';
    const params = [req.user.id];

    if (lida !== undefined) {
        query += ' AND lida = ?';
        params.push(lida === 'true' ? 1 : 0);
    }

    query += ' ORDER BY created_at DESC LIMIT 50';

    db.all(query, params, (err, notificacoes) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar notificações' });
        }
        res.json(notificacoes);
    });
});

// Marcar notificação como lida
router.put('/:id/ler', (req, res) => {
    db.run(
        'UPDATE notificacoes SET lida = 1 WHERE id = ? AND (usuario_id IS NULL OR usuario_id = ?)',
        [req.params.id, req.user.id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Erro ao atualizar notificação' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Notificação não encontrada' });
            }
            res.json({ message: 'Notificação marcada como lida' });
        }
    );
});

// Marcar todas como lidas
router.put('/ler-todas', (req, res) => {
    db.run(
        'UPDATE notificacoes SET lida = 1 WHERE (usuario_id IS NULL OR usuario_id = ?) AND lida = 0',
        [req.user.id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Erro ao atualizar notificações' });
            }
            res.json({ message: `${this.changes} notificações marcadas como lidas` });
        }
    );
});

// Contar notificações não lidas
router.get('/contar/nao-lidas', (req, res) => {
    db.get(
        'SELECT COUNT(*) as total FROM notificacoes WHERE (usuario_id IS NULL OR usuario_id = ?) AND lida = 0',
        [req.user.id],
        (err, result) => {
            if (err) {
                return res.status(500).json({ error: 'Erro ao contar notificações' });
            }
            res.json({ total: result.total });
        }
    );
});

module.exports = router;

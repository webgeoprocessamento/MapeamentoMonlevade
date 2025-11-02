const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const { body, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Aplicar autenticação em todas as rotas
router.use(authenticate);

// Listar todos os casos
router.get('/', (req, res) => {
    const { status, limit = 100, offset = 0 } = req.query;
    
    let query = 'SELECT c.*, u.nome as usuario_nome FROM casos c LEFT JOIN usuarios u ON c.usuario_id = u.id';
    const params = [];

    if (status) {
        query += ' WHERE c.status = ?';
        params.push(status);
    }

    query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    db.all(query, params, (err, casos) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar casos' });
        }
        res.json(casos);
    });
});

// Obter caso por ID
router.get('/:id', (req, res) => {
    db.get('SELECT c.*, u.nome as usuario_nome FROM casos c LEFT JOIN usuarios u ON c.usuario_id = u.id WHERE c.id = ?', 
           [req.params.id], (err, caso) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar caso' });
        }
        if (!caso) {
            return res.status(404).json({ error: 'Caso não encontrado' });
        }
        res.json(caso);
    });
});

// Criar novo caso
router.post('/', [
    body('latitude').isFloat({ min: -90, max: 90 }),
    body('longitude').isFloat({ min: -180, max: 180 }),
    body('status').isIn(['confirmado', 'suspeito', 'descartado']),
    body('data').notEmpty()
], authorize('admin', 'operador'), (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { latitude, longitude, status, descricao, data } = req.body;

    db.run(
        'INSERT INTO casos (usuario_id, latitude, longitude, status, descricao, data) VALUES (?, ?, ?, ?, ?, ?)',
        [req.user.id, latitude, longitude, status, descricao || null, data],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Erro ao criar caso' });
            }

            res.status(201).json({
                id: this.lastID,
                latitude,
                longitude,
                status,
                descricao,
                data,
                usuario_id: req.user.id
            });
        }
    );
});

// Atualizar caso
router.put('/:id', [
    body('latitude').optional().isFloat({ min: -90, max: 90 }),
    body('longitude').optional().isFloat({ min: -180, max: 180 }),
    body('status').optional().isIn(['confirmado', 'suspeito', 'descartado'])
], authorize('admin', 'operador'), (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const updates = [];
    const values = [];

    if (req.body.latitude !== undefined) {
        updates.push('latitude = ?');
        values.push(req.body.latitude);
    }
    if (req.body.longitude !== undefined) {
        updates.push('longitude = ?');
        values.push(req.body.longitude);
    }
    if (req.body.status !== undefined) {
        updates.push('status = ?');
        values.push(req.body.status);
    }
    if (req.body.descricao !== undefined) {
        updates.push('descricao = ?');
        values.push(req.body.descricao);
    }
    if (req.body.data !== undefined) {
        updates.push('data = ?');
        values.push(req.body.data);
    }

    if (updates.length === 0) {
        return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.params.id);

    db.run(
        `UPDATE casos SET ${updates.join(', ')} WHERE id = ?`,
        values,
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Erro ao atualizar caso' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Caso não encontrado' });
            }
            res.json({ message: 'Caso atualizado com sucesso', id: req.params.id });
        }
    );
});

// Deletar caso
router.delete('/:id', authorize('admin'), (req, res) => {
    db.run('DELETE FROM casos WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Erro ao deletar caso' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Caso não encontrado' });
        }
        res.json({ message: 'Caso deletado com sucesso' });
    });
});

// Estatísticas
router.get('/stats/summary', (req, res) => {
    db.all(`
        SELECT 
            status,
            COUNT(*) as total,
            COUNT(CASE WHEN date(data) >= date('now', '-7 days') THEN 1 END) as ultimos_7_dias
        FROM casos
        GROUP BY status
    `, [], (err, stats) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar estatísticas' });
        }
        res.json(stats);
    });
});

module.exports = router;

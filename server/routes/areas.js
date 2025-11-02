const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const { body, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

router.use(authenticate);

// Listar todas as áreas
router.get('/', (req, res) => {
    const { nivel, limit = 100, offset = 0 } = req.query;
    
    let query = 'SELECT a.*, u.nome as usuario_nome FROM areas_risco a LEFT JOIN usuarios u ON a.usuario_id = u.id';
    const params = [];

    if (nivel) {
        query += ' WHERE a.nivel = ?';
        params.push(nivel);
    }

    query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    db.all(query, params, (err, areas) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar áreas' });
        }
        res.json(areas);
    });
});

// Obter área por ID
router.get('/:id', (req, res) => {
    db.get('SELECT a.*, u.nome as usuario_nome FROM areas_risco a LEFT JOIN usuarios u ON a.usuario_id = u.id WHERE a.id = ?', 
           [req.params.id], (err, area) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar área' });
        }
        if (!area) {
            return res.status(404).json({ error: 'Área não encontrada' });
        }
        res.json(area);
    });
});

// Criar nova área (gera notificação)
router.post('/', [
    body('latitude').isFloat({ min: -90, max: 90 }),
    body('longitude').isFloat({ min: -180, max: 180 }),
    body('nivel').isIn(['alto', 'medio', 'baixo']),
    body('data').notEmpty()
], authorize('admin', 'operador'), (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { latitude, longitude, nivel, raio = 500, descricao, data } = req.body;

    db.run(
        'INSERT INTO areas_risco (usuario_id, latitude, longitude, nivel, raio, descricao, data) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [req.user.id, latitude, longitude, nivel, raio, descricao || null, data],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Erro ao criar área' });
            }

            const areaId = this.lastID;

            // Criar notificação para nova área de risco
            if (nivel === 'alto') {
                const titulo = 'Nova Área de Alto Risco Identificada';
                const mensagem = `Uma nova área de ${nivel} risco foi cadastrada em ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

                db.run(
                    'INSERT INTO notificacoes (tipo, titulo, mensagem) VALUES (?, ?, ?)',
                    ['area_risco', titulo, mensagem],
                    () => {
                        // Emitir evento via Socket.IO (se disponível)
                        if (req.app.get('io')) {
                            req.app.get('io').emit('nova_area_risco', {
                                id: areaId,
                                latitude,
                                longitude,
                                nivel,
                                titulo,
                                mensagem
                            });
                        }
                    }
                );
            }

            res.status(201).json({
                id: areaId,
                latitude,
                longitude,
                nivel,
                raio,
                descricao,
                data,
                usuario_id: req.user.id
            });
        }
    );
});

// Atualizar área
router.put('/:id', [
    body('latitude').optional().isFloat({ min: -90, max: 90 }),
    body('longitude').optional().isFloat({ min: -180, max: 180 }),
    body('nivel').optional().isIn(['alto', 'medio', 'baixo'])
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
    if (req.body.nivel !== undefined) {
        updates.push('nivel = ?');
        values.push(req.body.nivel);
    }
    if (req.body.raio !== undefined) {
        updates.push('raio = ?');
        values.push(req.body.raio);
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
        `UPDATE areas_risco SET ${updates.join(', ')} WHERE id = ?`,
        values,
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Erro ao atualizar área' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Área não encontrada' });
            }
            res.json({ message: 'Área atualizada com sucesso', id: req.params.id });
        }
    );
});

// Deletar área
router.delete('/:id', authorize('admin'), (req, res) => {
    db.run('DELETE FROM areas_risco WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Erro ao deletar área' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Área não encontrada' });
        }
        res.json({ message: 'Área deletada com sucesso' });
    });
});

module.exports = router;

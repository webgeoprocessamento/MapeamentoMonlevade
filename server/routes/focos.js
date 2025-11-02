const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const { body, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

router.use(authenticate);

// Listar todos os focos
router.get('/', (req, res) => {
    const { tipo, limit = 100, offset = 0 } = req.query;
    
    let query = 'SELECT f.*, u.nome as usuario_nome FROM focos f LEFT JOIN usuarios u ON f.usuario_id = u.id';
    const params = [];

    if (tipo) {
        query += ' WHERE f.tipo = ?';
        params.push(tipo);
    }

    query += ' ORDER BY f.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    db.all(query, params, (err, focos) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar focos' });
        }
        res.json(focos);
    });
});

// Obter foco por ID
router.get('/:id', (req, res) => {
    db.get('SELECT f.*, u.nome as usuario_nome FROM focos f LEFT JOIN usuarios u ON f.usuario_id = u.id WHERE f.id = ?', 
           [req.params.id], (err, foco) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar foco' });
        }
        if (!foco) {
            return res.status(404).json({ error: 'Foco não encontrado' });
        }
        res.json(foco);
    });
});

// Criar novo foco
router.post('/', [
    body('latitude').isFloat({ min: -90, max: 90 }),
    body('longitude').isFloat({ min: -180, max: 180 }),
    body('tipo').isIn([
        // Depósitos Fixos e Elevados
        'caixa-dagua-cisterna', 'balde-tambor', 'piscina-desativada',
        // Depósitos Móveis e Residuais
        'pneu', 'garrafa-lata-plastico', 'lixo-ceu-aberto', 'objetos-em-desuso',
        // Depósitos Naturais ou Estruturais
        'agua-parada-estrutura', 'vaso-planta-prato', 'bebedouro-animal', 'ralo-caixa-passagem',
        'outro'
    ]),
    body('data').notEmpty()
], authorize('admin', 'operador'), (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { latitude, longitude, tipo, origem = 'vistoria', descricao, data } = req.body;

    db.run(
        'INSERT INTO focos (usuario_id, latitude, longitude, tipo, origem, descricao, data) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [req.user.id, latitude, longitude, tipo, origem, descricao || null, data],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Erro ao criar foco' });
            }

            res.status(201).json({
                id: this.lastID,
                latitude,
                longitude,
                tipo,
                descricao,
                data,
                usuario_id: req.user.id
            });
        }
    );
});

// Atualizar foco
router.put('/:id', [
    body('latitude').optional().isFloat({ min: -90, max: 90 }),
    body('longitude').optional().isFloat({ min: -180, max: 180 }),
    body('tipo').optional().isIn([
        'caixa-dagua-cisterna', 'balde-tambor', 'piscina-desativada',
        'pneu', 'garrafa-lata-plastico', 'lixo-ceu-aberto', 'objetos-em-desuso',
        'agua-parada-estrutura', 'vaso-planta-prato', 'bebedouro-animal', 'ralo-caixa-passagem',
        'outro'
    ])
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
    if (req.body.tipo !== undefined) {
        updates.push('tipo = ?');
        values.push(req.body.tipo);
    }
    if (req.body.origem !== undefined) {
        updates.push('origem = ?');
        values.push(req.body.origem);
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
        `UPDATE focos SET ${updates.join(', ')} WHERE id = ?`,
        values,
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Erro ao atualizar foco' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Foco não encontrado' });
            }
            res.json({ message: 'Foco atualizado com sucesso', id: req.params.id });
        }
    );
});

// Deletar foco
router.delete('/:id', authorize('admin'), (req, res) => {
    db.run('DELETE FROM focos WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Erro ao deletar foco' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Foco não encontrado' });
        }
        res.json({ message: 'Foco deletado com sucesso' });
    });
});

module.exports = router;

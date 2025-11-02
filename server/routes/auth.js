const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const config = require('../config');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Login
router.post('/login', [
    body('email').isEmail().normalizeEmail(),
    body('senha').notEmpty()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, senha } = req.body;

    db.get('SELECT * FROM usuarios WHERE email = ? AND ativo = 1', [email], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Erro no servidor' });
        }

        if (!user) {
            return res.status(401).json({ error: 'Email ou senha inválidos' });
        }

        bcrypt.compare(senha, user.senha, (err, match) => {
            if (err || !match) {
                return res.status(401).json({ error: 'Email ou senha inválidos' });
            }

            const token = jwt.sign(
                { id: user.id, email: user.email, nivel: user.nivel, nome: user.nome },
                config.jwtSecret,
                { expiresIn: '7d' }
            );

            res.json({
                token,
                user: {
                    id: user.id,
                    nome: user.nome,
                    email: user.email,
                    nivel: user.nivel
                }
            });
        });
    });
});

// Registrar novo usuário (apenas admin)
router.post('/register', [
    body('nome').notEmpty().trim(),
    body('email').isEmail().normalizeEmail(),
    body('senha').isLength({ min: 6 }),
    body('nivel').isIn(['admin', 'operador', 'visualizador'])
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { nome, email, senha, nivel } = req.body;

    // Verificar se usuário está autenticado e é admin
    if (!req.user || req.user.nivel !== 'admin') {
        return res.status(403).json({ error: 'Apenas administradores podem criar usuários' });
    }

    bcrypt.hash(senha, 10, (err, hash) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao processar senha' });
        }

        db.run(
            'INSERT INTO usuarios (nome, email, senha, nivel) VALUES (?, ?, ?, ?)',
            [nome, email, hash, nivel || 'operador'],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(400).json({ error: 'Email já cadastrado' });
                    }
                    return res.status(500).json({ error: 'Erro ao criar usuário' });
                }

                res.status(201).json({
                    id: this.lastID,
                    nome,
                    email,
                    nivel: nivel || 'operador'
                });
            }
        );
    });
});

// Verificar token
router.get('/verify', (req, res) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ valid: false });
    }

    try {
        const decoded = jwt.verify(token, config.jwtSecret);
        res.json({ valid: true, user: decoded });
    } catch (error) {
        res.status(401).json({ valid: false });
    }
});

module.exports = router;

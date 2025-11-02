const jwt = require('jsonwebtoken');
const config = require('../config');

module.exports = {
    // Middleware para verificar token JWT
    authenticate: (req, res, next) => {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Token não fornecido' });
        }

        try {
            const decoded = jwt.verify(token, config.jwtSecret);
            req.user = decoded;
            next();
        } catch (error) {
            res.status(401).json({ error: 'Token inválido' });
        }
    },

    // Middleware para verificar nível de acesso
    authorize: (...allowedLevels) => {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({ error: 'Usuário não autenticado' });
            }

            if (!allowedLevels.includes(req.user.nivel)) {
                return res.status(403).json({ error: 'Acesso negado' });
            }

            next();
        };
    }
};

// Model: clients table (client profile linked to a user).
const db = require('../config/db');

const Client = {
    findByUserId(userId) {
        return db.queryOne('SELECT client_id, user_id, phone, address FROM clients WHERE user_id = ?', [userId]);
    },

    async getUserId(clientId) {
        const row = await db.queryOne('SELECT user_id FROM clients WHERE client_id = ?', [clientId]);
        return row ? row.user_id : null;
    },

    async create({ user_id, phone, address }, conn = null) {
        const sql = 'INSERT INTO clients (user_id, phone, address) VALUES (?, ?, ?)';
        const params = [user_id, phone, address];
        const result = conn ? (await conn.query(sql, params))[0] : await db.query(sql, params);
        return result.insertId;
    },
};

module.exports = Client;

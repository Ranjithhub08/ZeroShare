const db = require('../database/db');

exports.searchAll = async (query, userId, role) => {
  const q = `%${query}%`;
  const isAdmin = role === 'admin';
  const uf = isAdmin ? '' : `AND user_id = $2`;
  const vp = isAdmin ? [q] : [q, userId];

  const vault = await db.query(
    `SELECT id, data_type as title, created_at as timestamp, 'vault' as type FROM user_data WHERE data_type ILIKE $1 ${uf} LIMIT 5`, vp
  );
  const consents = await db.query(
    `SELECT id, app_name as title, data_type, created_at as timestamp, 'consent' as type FROM consents WHERE (app_name ILIKE $1 OR data_type ILIKE $1) ${uf} LIMIT 5`, vp
  );
  const audit = await db.query(
    `SELECT id, event_type as title, app_name, timestamp, 'audit' as type FROM audit_logs WHERE (event_type ILIKE $1 OR app_name ILIKE $1) ${isAdmin ? '' : 'AND user_id = $2'} LIMIT 5`, vp
  );

  return { data_vault: vault.rows, consents: consents.rows, audit_logs: audit.rows };
};

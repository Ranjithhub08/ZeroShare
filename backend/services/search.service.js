const db = require('../database/db');

exports.searchAll = async (query) => {
  const searchTerm = `%${query}%`;
  
  // Search Data Vault (user_data)
  const vaultQuery = `SELECT id, data_type as title, created_at as timestamp, 'vault' as type FROM user_data WHERE data_type ILIKE $1 OR id ILIKE $1 LIMIT 5`;
  const vaultResults = await db.query(vaultQuery, [searchTerm]);

  // Search Consents
  const consentQuery = `SELECT id, app_name as title, data_type, created_at as timestamp, 'consent' as type FROM consents WHERE app_name ILIKE $1 OR data_type ILIKE $1 LIMIT 5`;
  const consentResults = await db.query(consentQuery, [searchTerm]);

  // Search Audit Logs
  const auditQuery = `SELECT id, event_type as title, app_name, timestamp, 'audit' as type FROM audit_logs WHERE event_type ILIKE $1 OR app_name ILIKE $1 LIMIT 5`;
  const auditResults = await db.query(auditQuery, [searchTerm]);

  return {
    data_vault: vaultResults.rows,
    consents: consentResults.rows,
    audit_logs: auditResults.rows
  };
};

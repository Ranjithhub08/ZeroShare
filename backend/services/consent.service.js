const db = require('../database/db');

class ConsentService {
  async getAllConsents() {
    const result = await db.query('SELECT * FROM consents ORDER BY created_at DESC');
    return result.rows;
  }

  async updateConsentStatus(id, newStatus) {
    const validStatuses = ['PENDING', 'GRANTED', 'DENIED', 'REVOKED'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error('Invalid status value');
    }

    const result = await db.query(
      'UPDATE consents SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [newStatus, id]
    );

    if (result.rows.length === 0) {
      throw new Error('Consent request not found');
    }

    return result.rows[0];
  }
}

module.exports = new ConsentService();

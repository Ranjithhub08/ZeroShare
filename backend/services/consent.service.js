const db = require('../database/db');

class ConsentService {
  async getAllConsents(page = 1, limit = 10, sortBy = 'created_at', sortDir = 'DESC') {
    const offset = (page - 1) * limit;
    
    const countResult = await db.query('SELECT COUNT(*) FROM consents');
    const total = parseInt(countResult.rows[0].count);

    const query = `
      SELECT * FROM consents 
      ORDER BY ${sortBy} ${sortDir} 
      LIMIT ${limit} OFFSET ${offset}
    `;
    const result = await db.query(query);
    
    return {
      consents: result.rows,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    };
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

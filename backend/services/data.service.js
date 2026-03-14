const db = require('../database/db');

class DataService {
  async listData(page = 1, limit = 10, sortBy = 'id', sortDir = 'ASC') {
    const offset = (page - 1) * limit;
    
    const countResult = await db.query('SELECT COUNT(*) FROM user_data');
    const total = parseInt(countResult.rows[0].count);

    const query = `
      SELECT * FROM user_data 
      ORDER BY ${sortBy} ${sortDir} 
      LIMIT ${limit} OFFSET ${offset}
    `;
    const result = await db.query(query);
    
    return {
      data: result.rows,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    };
  }
}

module.exports = new DataService();

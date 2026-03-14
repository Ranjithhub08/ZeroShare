const dataService = require('../services/data.service');

exports.listData = async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = 'id', sortDir = 'ASC' } = req.query;
    const result = await dataService.listData(page, limit, sortBy, sortDir);
    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error fetching data logs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch vault data' });
  }
};

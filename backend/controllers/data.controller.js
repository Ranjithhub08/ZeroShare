const dataService = require('../services/data.service');

exports.listData = async (req, res) => {
  try {
    const { page=1, limit=10 } = req.query;
    const result = await dataService.listData(req.userId, req.userRole, page, limit);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch vault data' });
  }
};

exports.addData = async (req, res) => {
  try {
    const { data_type, value } = req.body;
    if (!data_type || !value) return res.status(400).json({ success: false, error: 'data_type and value are required' });
    const item = await dataService.addData(req.userId, data_type, value);
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to add data' });
  }
};

exports.deleteData = async (req, res) => {
  try {
    await dataService.deleteData(req.params.id, req.userId, req.userRole);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

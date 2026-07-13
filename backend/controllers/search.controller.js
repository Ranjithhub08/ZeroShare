const searchService = require('../services/search.service');

exports.search = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2)
      return res.json({ success: true, results: { data_vault: [], consents: [], audit_logs: [] } });
    const results = await searchService.searchAll(q, req.userId, req.userRole);
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Search failed' });
  }
};

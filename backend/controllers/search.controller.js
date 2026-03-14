const searchService = require('../services/search.service');

exports.search = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.status(200).json({ success: true, results: { data_vault: [], consents: [], audit_logs: [] } });
    }

    const results = await searchService.searchAll(q);
    res.status(200).json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Global search error:', error);
    res.status(500).json({ success: false, error: 'Search failed' });
  }
};

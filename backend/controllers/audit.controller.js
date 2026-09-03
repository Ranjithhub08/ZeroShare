const auditService = require('../services/audit.service');

exports.listLogs = async (req, res) => {
  try {
    const { page=1, limit=10, sortBy='timestamp', sortDir='DESC' } = req.query;
    const result = await auditService.getLogs(req.userId, req.userRole, page, limit, sortBy, sortDir);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
  }
};

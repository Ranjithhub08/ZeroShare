const auditService = require('../services/audit.service');

exports.listLogs = async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = 'timestamp', sortDir = 'DESC' } = req.query;
    const result = await auditService.getAllLogs(page, limit, sortBy, sortDir);
    res.status(200).json({
      success: true,
      data: result.logs,
      count: result.total,
      page: result.page,
      totalPages: result.totalPages
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
  }
};

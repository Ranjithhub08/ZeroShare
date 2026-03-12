const auditService = require('../services/audit.service');

exports.listLogs = async (req, res) => {
  try {
    const logs = await auditService.getAllLogs();
    res.status(200).json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};

const dataService = require('../services/data.service');
const path = require('path');
const fs = require('fs');
const db = require('../database/db');

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

exports.exportData = async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    // Admin cannot export — users only
    if (req.userRole === 'admin')
      return res.status(403).json({ success: false, error: 'Admin cannot export user data' });
    const result = await dataService.exportData(req.userId);
    if (format === 'csv') {
      const header = 'id,data_type,value,created_at\n';
      const rows = result.map(r =>
        `${r.id},"${r.data_type}","${String(r.value).replace(/"/g,'""')}","${r.created_at}"`
      ).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="zeroshare-export.csv"');
      return res.send(header + rows);
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="zeroshare-export.json"');
    res.json({ exported_at: new Date().toISOString(), records: result });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Export failed' });
  }
};

exports.deleteData = async (req, res) => {
  try {
    // If it's a file record, delete the file from disk first
    const rec = await db.query('SELECT file_url FROM user_data WHERE id=$1 AND (user_id=$2 OR $3=true)', [req.params.id, req.userId, req.userRole === 'admin']);
    if (rec.rows[0]?.file_url) {
      const filename = rec.rows[0].file_url.split('/uploads/data/')[1];
      if (filename) {
        const filePath = path.join(__dirname, '../uploads/data', filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    }
    await dataService.deleteData(req.params.id, req.userId, req.userRole);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
    const { data_type } = req.body;
    if (!data_type) return res.status(400).json({ success: false, error: 'data_type is required' });
    const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5001}`;
    const fileUrl = `${baseUrl}/uploads/data/${req.file.filename}`;
    const result = await db.query(
      `INSERT INTO user_data (user_id, data_type, value, record_type, file_name, file_size, file_url)
       VALUES ($1, $2, $3, 'file', $4, $5, $6) RETURNING *`,
      [req.userId, data_type, req.file.originalname, req.file.originalname, req.file.size, fileUrl]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('File upload error:', err);
    res.status(500).json({ success: false, error: 'Failed to upload file' });
  }
};

exports.downloadFile = async (req, res) => {
  try {
    const rec = await db.query('SELECT * FROM user_data WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
    if (!rec.rows[0]) return res.status(404).json({ success: false, error: 'Record not found' });
    const { file_url, file_name } = rec.rows[0];
    if (!file_url) return res.status(400).json({ success: false, error: 'Not a file record' });
    const filename = file_url.split('/uploads/data/')[1];
    const filePath = path.join(__dirname, '../uploads/data', filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, error: 'File not found on server' });
    res.download(filePath, file_name);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Download failed' });
  }
};

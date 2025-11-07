const express = require('express');
const router = express.Router();
const { generatePresignedPut } = require('../utils/s3');

// GET /api/uploads/presign?key=products/abc.jpg&contentType=image/jpeg
router.get('/presign', async (req, res) => {
  try {
    const { key, contentType } = req.query;
    if (!key) return res.status(400).json({ error: 'key query required' });
    const url = await generatePresignedPut(key, contentType || 'application/octet-stream');
    res.json({ ok: true, url, key });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// For Cloudinary you can provide client-side upload or server-side signature in future.

module.exports = router;

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../utils/jwt');
const supabase = require('../utils/supabase');

router.use(authMiddleware);

router.get('/orders', async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(200);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/orders/:id/status', async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { status, eta } = req.body;
    const payload = { status };
    if (eta) payload.eta = new Date(eta).toISOString();
    const { data, error } = await supabase.from('orders').update(payload).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

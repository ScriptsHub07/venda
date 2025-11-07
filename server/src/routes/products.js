const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabase');
const { authMiddleware } = require('../utils/jwt');

// List products
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('products').select('*').limit(100);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('products').select('*').eq('id', req.params.id).single();
    if (error) return res.status(404).json({ error: 'Não encontrado' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// admin create
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const data = req.body;
    if (!data.title || !data.priceCents) return res.status(400).json({ error: 'title e priceCents obrigatórios' });
    if (data.images && data.images.length > 5) return res.status(400).json({ error: 'Máx 5 imagens' });
    const payload = Object.assign({ stock: data.stock || 0, description: data.description || '' }, data);
    const { data: created, error } = await supabase.from('products').insert(payload).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// admin update
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const data = req.body;
    if (data.images && data.images.length > 5) return res.status(400).json({ error: 'Máx 5 imagens' });
    const { data: updated, error } = await supabase.from('products').update(data).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// admin delete
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { error } = await supabase.from('products').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

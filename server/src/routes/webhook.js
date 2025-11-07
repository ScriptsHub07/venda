const express = require('express');
const router = express.Router();
const { sendAdminOrderEmail } = require('../utils/email');
const { verifyWebhookSignature } = require('../services/efiBank');
const supabase = require('../utils/supabase');

// Efí Bank PIX webhook. Verify signature when EFI_WEBHOOK_SECRET is configured.
router.post('/efi/pix', async (req, res) => {
  try {
    // Optionally verify signature using Efí Bank secret - implementation depends on Efí spec
    const okSig = verifyWebhookSignature(req);
    if (!okSig) return res.status(401).json({ error: 'Invalid signature' });

    const { pixId, status } = req.body;
    if (!pixId) return res.status(400).json({ error: 'pixId required' });

    // find order containing this pixId (simple scan - consider indexing payment.pixId separately)
    const { data: orders, error: ordersErr } = await supabase.from('orders').select('*').limit(1000);
    if (ordersErr) return res.status(500).json({ error: ordersErr.message });
    const order = orders.find(o => {
      try {
        return o.payment && (o.payment.pixId === pixId || (o.payment.payload && (o.payment.payload.id === pixId || o.payment.payload.pixId === pixId)));
      } catch (e) { return false }
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // get user info for email
    let user = null;
    if (order.user_id) {
      const { data: u, error: uErr } = await supabase.from('users').select('*').eq('id', order.user_id).limit(1).single();
      if (!uErr) user = u;
    }

    if (status === 'confirmed' || status === 'confirmed_payment' || status === 'paid') {
      try {
        await supabase.from('orders').update({ payment: { ...(order.payment||{}), status: 'confirmado' } }).eq('id', order.id);
      } catch (e) { console.error('Failed to update order payment status in supabase', e); }
      // send email to admin
      try {
        await sendAdminOrderEmail({ adminEmail: process.env.ADMIN_EMAIL, order: Object.assign({}, order, { user }) });
      } catch (err) { console.error('Failed to send email', err); }
    } else if (status === 'canceled') {
      // restore reserved stock
      try {
        for (const it of order.items || []) {
          const { data: p, error: pErr } = await supabase.from('products').select('*').eq('id', it.product).limit(1).single();
          const newStock = (p && p.stock ? p.stock : 0) + (it.quantity || 0);
          await supabase.from('products').update({ stock: newStock }).eq('id', it.product);
        }
        await supabase.from('orders').update({ payment: { ...(order.payment||{}), status: 'cancelado' } }).eq('id', order.id);
      } catch (err) { console.error('Failed to restore stock on cancel', err); }
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('Webhook handling error', err);
    return res.status(500).json({ error: 'internal' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { authMiddleware, sign } = require('../utils/jwt');
const { v4: uuidv4 } = require('uuid');
const { createPixPayment } = require('../services/efiBank');
const supabase = require('../utils/supabase');

// create order and initiate PIX (mock)
router.post('/create', authMiddleware, async (req, res) => {
  const { items, address, coupon } = req.body;
  if (!items || !items.length) return res.status(400).json({ error: 'Carrinho vazio' });
  // only include checked items
  const checked = items.filter(i => i.checked !== false);
  if (!checked.length) return res.status(400).json({ error: 'Selecione itens para pagamento' });

  let total = 0;
  const enriched = [];
  // stock verification and reserve (decrement) at order creation
  const toRestore = [];
  // Using Supabase: fetch products and verify stock
  for (const it of checked) {
    const { data: products, error } = await supabase.from('products').select('*').eq('id', it.product).limit(1);
    if (error) return res.status(500).json({ error: error.message });
    const p = products && products[0];
    if (!p) return res.status(400).json({ error: `Produto inválido: ${it.product}` });
    if ((p.stock || 0) < it.quantity) {
      return res.status(400).json({ error: `Estoque insuficiente para ${p.title}` });
    }
    enriched.push({ product: p.id, title: p.title, priceCents: p.priceCents, quantity: it.quantity });
    total += p.priceCents * it.quantity;
    // reserve stock by decrementing immediately in DB
    const { error: updErr } = await supabase.from('products').update({ stock: (p.stock || 0) - it.quantity }).eq('id', p.id);
    if (updErr) return res.status(500).json({ error: updErr.message });
    toRestore.push({ productId: p.id, restoreQty: it.quantity });
  }

  // Apply coupon if provided (fetch and validate)
  let couponApplied = null;
  if (coupon) {
    const { data: cData, error: cErr } = await supabase.from('coupons').select('*').eq('code', coupon).limit(1).single();
    if (!cData || cErr) {
      // restore stock before returning
      for (const r of toRestore) { await supabase.from('products').update({ stock: supabase.raw('stock + ?', [r.restoreQty]) }).eq('id', r.productId).catch(() => {}); }
      return res.status(400).json({ error: 'Cupom inválido' });
    }
    const c = cData;
    if (c.valid_until && new Date(c.valid_until) < new Date()) {
      for (const r of toRestore) { await supabase.from('products').update({ stock: supabase.raw('stock + ?', [r.restoreQty]) }).eq('id', r.productId).catch(() => {}); }
      return res.status(400).json({ error: 'Cupom expirado' });
    }
    if (c.max_uses && (c.used || 0) >= c.max_uses) {
      for (const r of toRestore) { await supabase.from('products').update({ stock: supabase.raw('stock + ?', [r.restoreQty]) }).eq('id', r.productId).catch(() => {}); }
      return res.status(400).json({ error: 'Cupom sem usos restantes' });
    }
    // calculate discount
    let discount = 0;
    if (c.type === 'percent') discount = Math.round(total * (c.value / 100));
    else discount = Math.round(c.value);
    total = Math.max(0, total - discount);
    couponApplied = { code: c.code, discount_cents: discount };
    // increment used
    await supabase.from('coupons').update({ used: (c.used || 0) + 1 }).eq('id', c.id);
  }

  // calculate shipping
  const SHIPPING_FLAT_CENTS = parseInt(process.env.SHIPPING_FLAT_CENTS || '1500');
  const FREE_SHIPPING_OVER_CENTS = parseInt(process.env.FREE_SHIPPING_OVER_CENTS || '10000');
  let shippingCents = total >= FREE_SHIPPING_OVER_CENTS ? 0 : SHIPPING_FLAT_CENTS;
  const totalWithShipping = total + shippingCents;

  // create order record in Supabase orders table
  const orderPayload = {
    user_id: req.user.id,
    items: enriched,
    address,
    total_cents: totalWithShipping,
    payment: { method: 'pix', status: 'pendente' },
    coupon_applied: couponApplied,
    shipping_cents: shippingCents,
    status: 'pedido feito'
  };
  const { data: createdOrder, error: orderErr } = await supabase.from('orders').insert(orderPayload).select().single();
  if (orderErr) {
    // rollback reserved stock
    for (const r of toRestore) { await supabase.from('products').update({ stock: supabase.raw('stock + ?', [r.restoreQty]) }).eq('id', r.productId).catch(() => {}); }
    return res.status(500).json({ error: orderErr.message });
  }
  const order = createdOrder;
  // Create PIX via Efí Bank when configured, otherwise fallback to mock
  try {
    let pixPayload;
    if (process.env.EFI_API_KEY) {
      const efiResp = await createPixPayment({ amountCents: totalWithShipping, orderId: order.id });
      pixPayload = efiResp;
      // update order with pix info
      await supabase.from('orders').update({ payment: { ...(order.payment||{}), pixId: efiResp.id || efiResp.pixId || uuidv4(), payload: efiResp } }).eq('id', order.id);
      return res.json({ ok: true, orderId: order.id, pix: efiResp });
    }
    // fallback mock PIX creation
    const pixId = uuidv4();
    pixPayload = { pixId, amount: totalWithShipping, expiresAt: Date.now() + 1000*60*30, qr: `PIX-QR-${pixId}` };
    await supabase.from('orders').update({ payment: { ...(order.payment||{}), pixId, payload: pixPayload } }).eq('id', order.id);
    return res.json({ ok: true, orderId: order.id, pix: pixPayload });
  } catch (err) {
    console.error('create pix error', err);
    return res.status(500).json({ error: 'Erro ao criar pagamento' });
  }
});

module.exports = router;

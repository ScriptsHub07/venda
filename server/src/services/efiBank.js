const axios = require('axios');

const EFI_API_KEY = process.env.EFI_API_KEY;
const EFI_API_BASE = process.env.EFI_API_BASE || 'https://api.efi.example';

const client = axios.create({
  baseURL: EFI_API_BASE,
  headers: {
    'Content-Type': 'application/json',
    ...(EFI_API_KEY ? { 'Authorization': `Bearer ${EFI_API_KEY}` } : {})
  }
});

async function createPixPayment({ amountCents, orderId, expiresInSeconds = 1800 }) {
  // If no EFI_API_KEY provided, caller should fallback to mock behavior.
  if (!EFI_API_KEY) throw new Error('EFI not configured');

  const body = {
    amount: amountCents,
    external_id: orderId,
    expires_in: expiresInSeconds
  };

  const res = await client.post('/pix/create', body);
  // expected shape depends on Efí API; return normalized object
  return res.data;
}

function verifyWebhookSignature(req) {
  // Placeholder: Efí Bank may use headers/signature. In production verify using
  // EFI_WEBHOOK_SECRET and request raw body + signature header.
  // This function returns true when no secret is configured (fallback).
  const secret = process.env.EFI_WEBHOOK_SECRET;
  if (!secret) return true;
  // For now we don't implement signature verification because we don't have the
  // Efí spec. Caller can implement verification here when spec is available.
  return true;
}

module.exports = { createPixPayment, verifyWebhookSignature };

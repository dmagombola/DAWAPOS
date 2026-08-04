// sms-core.js - shared, environment-agnostic SMS helpers for DawaPOS.
// The Supabase send-sms edge function uses the same normalization and
// retry algorithm; this file lets us unit-test the logic in plain Node.

function normalizePhone(raw, defaultCc) {
  let digits = (raw || '').replace(/[^0-9]/g, '');
  if (!digits) return null;
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) {
    const cc = (defaultCc || '').replace(/[^0-9]/g, '');
    if (!cc) return null;
    digits = cc + digits.slice(1);
  }
  if (digits.length < 9 || digits.length > 15) return null;
  return '+' + digits;
}

// One automatic retry after `delayMs` on failure. Returns
// { ok, attempts, gatewayId?, error? }. `sender` is an async fn
// (to, message) => { ok, gatewayId?, error? } so tests can mock the gateway.
async function sendWithRetry(sender, to, message, delayMs = 3000, sleep = (ms) => new Promise(r => setTimeout(r, ms))) {
  let attempt = await sender(to, message);
  let attempts = 1;
  if (!attempt.ok) {
    await sleep(delayMs);
    attempt = await sender(to, message);
    attempts = 2;
  }
  return { ok: !!attempt.ok, attempts, gatewayId: attempt.gatewayId || null, error: attempt.error || null };
}

function fillTemplate(tpl, values) {
  return String(tpl || '').replace(/\{(\w+)\}/g, (m, k) => (values[k] !== undefined ? String(values[k]) : m));
}

module.exports = { normalizePhone, sendWithRetry, fillTemplate };

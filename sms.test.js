// sms.test.js - unit tests for the DawaPOS SMS pipeline (no real gateway needed).
// Run with:  node sms.test.js
const assert = require('assert');
const { normalizePhone, sendWithRetry, fillTemplate } = require('./sms-core.js');

let passed = 0;
function test(name, fn) { return Promise.resolve().then(fn).then(() => { passed++; console.log('  PASS', name); }).catch(e => { console.error('  FAIL', name, '-', e.message); process.exitCode = 1; }); }

(async () => {
  console.log('Phone normalization');
  await test('local number + country code', () => assert.strictEqual(normalizePhone('0712 345 678', '255'), '+255712345678'));
  await test('already international', () => assert.strictEqual(normalizePhone('+255712345678', '255'), '+255712345678'));
  await test('00 prefix', () => assert.strictEqual(normalizePhone('00255712345678', '254'), '+255712345678'));
  await test('strips formatting', () => assert.strictEqual(normalizePhone('+255 (712) 345-678', '255'), '+255712345678'));
  await test('rejects garbage', () => assert.strictEqual(normalizePhone('abc', '255'), null));
  await test('rejects too short', () => assert.strictEqual(normalizePhone('07123', '255'), null));
  await test('rejects local number without cc', () => assert.strictEqual(normalizePhone('0712345678', ''), null));

  console.log('Message template');
  await test('fills placeholders', () => {
    const out = fillTemplate('{business}: {receipt} total {total}', { business: 'DawaPOS', receipt: 'RCP-1', total: 'TZS 500.00' });
    assert.strictEqual(out, 'DawaPOS: RCP-1 total TZS 500.00');
  });
  await test('leaves unknown placeholders untouched', () => assert.strictEqual(fillTemplate('{a} {zzz}', { a: '1' }), '1 {zzz}'));

  console.log('Gateway send with retry (mocked)');
  await test('success on first attempt', async () => {
    let calls = 0;
    const res = await sendWithRetry(async () => { calls++; return { ok: true, gatewayId: 'ATXid_1' }; }, '+255712345678', 'hi', 1);
    assert.strictEqual(res.ok, true); assert.strictEqual(res.attempts, 1); assert.strictEqual(calls, 1); assert.strictEqual(res.gatewayId, 'ATXid_1');
  });
  await test('fails once then succeeds (retry)', async () => {
    let calls = 0;
    const res = await sendWithRetry(async () => { calls++; return calls === 1 ? { ok: false, error: 'timeout' } : { ok: true, gatewayId: 'ATXid_2' }; }, '+255712345678', 'hi', 1);
    assert.strictEqual(res.ok, true); assert.strictEqual(res.attempts, 2); assert.strictEqual(calls, 2);
  });
  await test('persistent failure returns error, no throw', async () => {
    let calls = 0;
    const res = await sendWithRetry(async () => { calls++; return { ok: false, error: 'insufficient credit' }; }, '+255712345678', 'hi', 1);
    assert.strictEqual(res.ok, false); assert.strictEqual(res.attempts, 2); assert.strictEqual(calls, 2); assert.strictEqual(res.error, 'insufficient credit');
  });

  console.log(passed + ' tests passed');
})();

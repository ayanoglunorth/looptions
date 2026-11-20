const test = require('node:test');
const assert = require('node:assert');

// Minimal in-memory stand-in for D1: only the four statements the Worker uses.
function fakeDb() {
  const cache = new Map(), usage = new Map();
  const stmt = sql => ({ bind: (...a) => ({
    first: async () => (sql.startsWith('SELECT') ? (cache.has(a.join('|')) ? { result: cache.get(a.join('|')) } : null) : null),
    run: async () => { if (sql.startsWith('INSERT OR REPLACE')) cache.set(a.slice(0, 3).join('|'), a[3]); },
    _bump: () => { usage.set(a[0], (usage.get(a[0]) || 0) + a[1]); return { results: [{ chars: usage.get(a[0]) }] }; },
  }) });
  return { usage, prepare: stmt, batch: async list => list.map(s => s._bump()) };
}
const call = async (env, body, headers = {}) => {
  const { default: worker } = await import('../worker/src/index.js');
  const r = await worker.fetch(new Request('https://x.test', { method: 'POST', headers, body: JSON.stringify(body) }), env);
  return { status: r.status, json: await r.json() };
};
const msFetch = reply => { let n = 0; globalThis.fetch = async () => { n++; return new Response(JSON.stringify(reply)); }; return () => n; };

test('worker: translates, caches, and charges only on a miss', async () => {
  const env = { DB: fakeDb(), MS_TRANSLATOR_KEY: 'k', MS_TRANSLATOR_REGION: 'r' };
  const calls = msFetch([{ translations: [{ normalizedTarget: 'ev' }] }]);
  assert.deepStrictEqual((await call(env, { text: 'House', from: 'en', to: 'tr' })).json, { text: 'ev' });
  assert.deepStrictEqual((await call(env, { text: 'house', from: 'en', to: 'tr' })).json, { text: 'ev' });
  assert.strictEqual(calls(), 1);
  assert.strictEqual([...env.DB.usage.values()][0], 5);
});

test('worker: rejects bad input and foreign origins, stops at the daily cap', async () => {
  const env = { DB: fakeDb(), MS_TRANSLATOR_KEY: 'k', MS_TRANSLATOR_REGION: 'r' };
  msFetch([{ translations: [{ normalizedTarget: 'ev' }] }]);
  assert.strictEqual((await call(env, { text: 'x', from: 'en', to: 'en' })).status, 400);
  assert.strictEqual((await call(env, { text: 'x', from: 'en', to: 'xx' })).status, 400);
  assert.strictEqual((await call(env, { text: 'x', from: 'en', to: 'tr' }, { Origin: 'https://evil.test' })).status, 403);
  env.DB.usage.set('d:' + new Date().toISOString().slice(0, 10), 100_000);
  assert.strictEqual((await call(env, { text: 'word', from: 'en', to: 'tr' })).status, 429);
});

// Word translation for the Looptions extension (Cloudflare Worker + D1): cache -> Microsoft Translator
// (dictionary for English pairs, plain translate otherwise).
// Request: POST { text, from, to }. Response: { text } or { error }. Secrets: MS_TRANSLATOR_KEY, MS_TRANSLATOR_REGION.
// Nothing about the caller is logged or stored; the cache keeps only (word, language pair, translation).
const LANGS = ['tr', 'en', 'es', 'ru', 'de', 'fr'];
const MAX_CHARS = 120;            // a word or short phrase, never a subtitle
const MONTHLY_CAP = 1_800_000;    // Microsoft F0 allows 2M characters a month; stop short of it
const DAILY_CAP = 100_000;        // one abuser cannot burn the whole month in a day (they can still block one day)
const MS = 'https://api.cognitive.microsofttranslator.com';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

async function microsoft(env, path, text) {
  const r = await fetch(`${MS}${path}`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': env.MS_TRANSLATOR_KEY,
      'Ocp-Apim-Subscription-Region': env.MS_TRANSLATOR_REGION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{ Text: text }]),
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`microsoft ${r.status}`);
  return (await r.json())[0];
}

// Microsoft bills every call, and a word missing from the dictionary costs two, so each call is charged first.
// One batch = one transaction: both counters move together.
async function charge(env, n) {
  const now = new Date().toISOString();
  const bump = env.DB.prepare('INSERT INTO usage (period, chars) VALUES (?1, ?2) ON CONFLICT(period) DO UPDATE SET chars = usage.chars + ?2 RETURNING chars');
  let month, day;
  try { [month, day] = await env.DB.batch([bump.bind('m:' + now.slice(0, 7), n), bump.bind('d:' + now.slice(0, 10), n)]); }
  catch { throw new Error('unavailable'); }
  if (month.results[0].chars > MONTHLY_CAP || day.results[0].chars > DAILY_CAP) throw new Error('quota');
}

async function translate(env, text, from, to) {
  // The dictionary only covers pairs with English on one side, and only single words.
  if ((from === 'en' || to === 'en') && !/\s/.test(text)) {
    await charge(env, text.length);
    const d = await microsoft(env, `/dictionary/lookup?api-version=3.0&from=${from}&to=${to}`, text);
    const words = [...new Set((d.translations ?? []).map(t => t.normalizedTarget))].slice(0, 3);
    if (words.length) return words.join(', ');
  }
  await charge(env, text.length);
  const t = await microsoft(env, `/translate?api-version=3.0&from=${from}&to=${to}`, text);
  return (t.translations?.[0]?.text ?? '').trim();
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return reply({ error: 'method' }, 405);
    // Pages of other sites must not spend our quota. Browsers always send Origin; curl does not, so this is only a filter.
    const origin = req.headers.get('Origin');
    if (origin && !origin.startsWith('chrome-extension://')) return reply({ error: 'forbidden' }, 403);

    let body;
    try { body = await req.json(); } catch { return reply({ error: 'bad request' }, 400); }
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const { from, to } = body;
    if (!text || text.length > MAX_CHARS || !LANGS.includes(from) || !LANGS.includes(to) || from === to) return reply({ error: 'bad request' }, 400);

    const key = text.toLowerCase();
    try {
      const hit = await env.DB.prepare('SELECT result FROM translations WHERE from_lang = ?1 AND to_lang = ?2 AND text_key = ?3').bind(from, to, key).first();
      if (hit) return reply({ text: hit.result });
    } catch { return reply({ error: 'unavailable' }, 503); }

    try {
      const result = await translate(env, text, from, to);
      if (!result) return reply({ error: 'empty' }, 404);
      await env.DB.prepare('INSERT OR REPLACE INTO translations (from_lang, to_lang, text_key, result) VALUES (?1, ?2, ?3, ?4)').bind(from, to, key, result).run().catch(() => {});
      return reply({ text: result });
    } catch (e) {
      if (e.message === 'quota') return reply({ error: 'quota' }, 429);
      return reply({ error: 'unavailable' }, e.message === 'unavailable' ? 503 : 502);
    }
  },
};

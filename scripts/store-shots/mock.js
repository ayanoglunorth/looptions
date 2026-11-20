(() => {
  const set = new URLSearchParams(location.search).get('set') || 'tr';
  const now = Date.now(), D = 864e5;
  const EN = set === 'en';
  const from = EN ? 'es' : 'en', to = EN ? 'en' : 'tr';
  const mk = (word, translation, extra = {}) => ({ word, translation, from, to, context: '', at: now - Math.random() * 1e6, ...extra });
  const W = EN ? [
    ['reacio', 'reluctant, unwilling', 'No quiero parecer reacio a ayudar.', { box: 2, due: now - D }],
    ['huir', 'to flee', 'Decidió huir antes del amanecer.', { box: 1, due: now - D }],
    ['tenaz', 'tenacious, persistent', 'Es una persona muy tenaz.', { box: 3, due: now + 5 * D }],
    ['vago', 'vague', 'Su respuesta fue muy vaga.', { box: 4, due: now + 20 * D }],
    ['deuda', 'debt', '', {}], ['ansia', 'longing, craving', '', { box: 1, due: now - D }],
  ] : [
    ['reluctant', 'isteksiz, gönülsüz', 'She was reluctant to leave the party.', { box: 2, due: now - D }],
    ['stumble', 'tökezlemek', 'I stumble over my words when I am nervous.', { box: 1, due: now - D }],
    ['thorough', 'ayrıntılı, titiz', 'He did a very thorough job.', { box: 3, due: now + 5 * D }],
    ['vague', 'belirsiz', 'Her answer was vague.', { box: 4, due: now + 20 * D }],
    ['eager', 'hevesli', '', {}], ['gratitude', 'minnettarlık', '', { box: 1, due: now - D }],
  ];
  const store = {
    seenSites: { 'video-site.example': now, 'lessons.example': now - 2 * D, 'talks.example': now - 9 * D },
    prefs: { primary: from, secondary: to, size: 100, lift: 6, sites: {}, preQuiz: false, level: 'B1' },
    words: W.map(([w, t, c, x]) => mk(w, t, { context: c, ...x })),
    t1: { tracks: [{ id: 'a', lang: from, label: 'Subtitles' }, { id: 'b', lang: to, label: 'Subtitles' }], sel: { primaryId: 'a', secondaryId: 'b' } },
  };
  const area = () => ({ get: async key => (typeof key === 'string' ? { [key]: store[key] } : {}), set: async o => Object.assign(store, o), remove: async () => {} });
  window.chrome = {
    storage: { sync: area(), local: area(), session: area(), onChanged: { addListener() {} } },
    tabs: { query: async () => [{ id: 1 }] },
    runtime: { openOptionsPage() {}, sendMessage: async () => ({}), getURL: p => location.origin + (p.startsWith('/') ? p : '/' + p), onMessage: { addListener() {} } },
    i18n: { getUILanguage: () => (EN ? 'en' : 'tr') },
  };
})();

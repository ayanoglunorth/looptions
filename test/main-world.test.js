const test = require('node:test');
const assert = require('node:assert');
const MW = require('../src/inject/main-world.js');

test('extractNetflixTracks prefers WebVTT, skips none/forced tracks', () => {
  const manifest = { result: { movieId: 7, timedtexttracks: [
    { isNoneTrack: true, language: 'xx' },
    { language: 'en', languageDescription: 'English', rawTrackType: 'subtitles', new_track_id: 'T1',
      ttDownloadables: { 'webvtt-lssdh-ios8': { urls: [{ url: 'https://nf/en.vtt' }] }, 'imsc1.1': { urls: [{ url: 'https://nf/en.xml' }] } } },
    { language: 'tr', languageDescription: 'Türkçe', rawTrackType: 'subtitles', new_track_id: 'T2',
      ttDownloadables: { 'imsc1.1': { downloadUrls: { a: 'https://nf/tr.xml' } } } },
    { language: 'tr', languageDescription: 'Türkçe', isForcedNarrative: true, ttDownloadables: {} },
  ] } };
  assert.deepStrictEqual(MW.extractNetflixTracks(manifest), { movieId: 7, tracks: [
    { id: 'nf:T1', url: 'https://nf/en.vtt', lang: 'en', label: 'English', source: 'netflix' },
    { id: 'nf:T2', url: 'https://nf/tr.xml', lang: 'tr', label: 'Türkçe', source: 'netflix' },
  ] });
  assert.strictEqual(MW.extractNetflixTracks({ foo: 1 }), null);
});

test('buildYouTubeTracks reuses the intercepted URL (keeps pot) for every track and adds tlang ones', () => {
  const intercepted = 'https://www.youtube.com/api/timedtext?v=abc&lang=en&kind=asr&pot=TOKEN&fmt=srv3';
  const list = [
    { languageCode: 'en', kind: 'asr', name: { simpleText: 'English (auto-generated)' } },
    { languageCode: 'de', name: { runs: [{ text: 'German' }] } },
  ];
  const out = MW.buildYouTubeTracks(intercepted, list, ['tr', 'de']);
  assert.deepStrictEqual(out.map(t => [t.id, t.lang, t.label]), [
    ['yt:en:asr', 'en', 'English (auto-generated)'],
    ['yt:de', 'de', 'German'],
    ['yt:tl:tr', 'tr', 'YouTube çevirisi'],
  ]);
  const de = new URL(out[1].url).searchParams;
  assert.strictEqual(de.get('lang'), 'de');
  assert.strictEqual(de.get('kind'), null);
  assert.strictEqual(de.get('pot'), 'TOKEN');
  assert.strictEqual(de.get('fmt'), 'json3');
  const tl = new URL(out[2].url).searchParams;
  assert.strictEqual(tl.get('lang'), 'de'); // a human track is a better translation source than asr
  assert.strictEqual(tl.get('tlang'), 'tr');
  assert.ok(out.every(t => t.fetchIn === 'page' && t.source === 'youtube'));
});

test('parsePlayerjsSubtitle reads "[Label]url" lists', () => {
  assert.deepStrictEqual(MW.parsePlayerjsSubtitle('[Türkçe]https://s/tr.srt,[English]/en.vtt', 'https://site.example/p/1'), [
    { url: 'https://s/tr.srt', label: 'Türkçe' },
    { url: 'https://site.example/en.vtt', label: 'English' },
  ]);
  assert.deepStrictEqual(MW.parsePlayerjsSubtitle('https://s/only.vtt', 'https://x/'), [{ url: 'https://s/only.vtt', label: '' }]);
  assert.deepStrictEqual(MW.parsePlayerjsSubtitle(undefined, 'https://x/'), []);
});

test('looksLikeSubtitle checks body signatures', () => {
  assert.ok(MW.looksLikeSubtitle('WEBVTT\n\n00:01.000 --> 00:02.000\nx'));
  assert.ok(MW.looksLikeSubtitle('﻿1\r\n00:00:01,000 --> 00:00:02,000\r\nx'));
  assert.ok(!MW.looksLikeSubtitle('{"a":1}'));
});

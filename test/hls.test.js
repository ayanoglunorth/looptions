const test = require('node:test');
const assert = require('node:assert');
require('../src/core/parse.js');
const DS = require('../src/core/hls.js');

test('parseMasterPlaylist lists subtitle renditions with absolute URLs', () => {
  const m3u8 = '#EXTM3U\n' +
    '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="a",NAME="English",URI="audio.m3u8"\n' +
    '#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="s",NAME="Türkçe",LANGUAGE="tr",URI="subs/tr/index.m3u8"\n' +
    '#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="s",NAME="English",LANGUAGE="en-US",DEFAULT=YES,URI="https://cdn.x/en.m3u8"\n' +
    '#EXT-X-STREAM-INF:BANDWIDTH=1,SUBTITLES="s"\nv.m3u8\n';
  assert.deepStrictEqual(DS.parseMasterPlaylist(m3u8, 'https://h.example/movie/master.m3u8?t=1'), [
    { url: 'https://h.example/movie/subs/tr/index.m3u8', lang: 'tr', label: 'Türkçe' },
    { url: 'https://cdn.x/en.m3u8', lang: 'en-US', label: 'English' },
  ]);
});

test('parseMediaPlaylist lists segment URLs', () => {
  const m3u8 = '#EXTM3U\n#EXT-X-TARGETDURATION:60\n#EXTINF:60,\nseg0.vtt\n#EXTINF:60,\n/abs/seg1.webvtt?x=1\n#EXT-X-ENDLIST\n';
  assert.deepStrictEqual(DS.parseMediaPlaylist(m3u8, 'https://h.example/subs/tr/index.m3u8'),
    ['https://h.example/subs/tr/seg0.vtt', 'https://h.example/abs/seg1.webvtt?x=1']);
});

test('mergeHlsSegments applies X-TIMESTAMP-MAP relative to the first segment and drops repeats', () => {
  const seg = (mpegts, body) => `WEBVTT\nX-TIMESTAMP-MAP=MPEGTS:${mpegts},LOCAL:00:00:00.000\n\n${body}`;
  const cues = DS.mergeHlsSegments([
    seg(900000, '00:00:01.000 --> 00:00:02.000\nA\n\n00:00:59.000 --> 00:01:01.000\nB\n'),
    seg(900000, '00:00:59.000 --> 00:01:01.000\nB\n\n00:01:05.000 --> 00:01:06.000\nC\n'),
    seg(6300000, '00:00:01.000 --> 00:00:02.000\nD\n'),
  ]);
  assert.deepStrictEqual(cues.map(c => [c.start, c.text]), [[1, 'A'], [59, 'B'], [61, 'D'], [65, 'C']]);
});

const test = require('node:test');
const assert = require('node:assert');
const DS = require('../src/core/lang.js');

const srt = t => `1\n00:00:01,000 --> 00:00:02,000\n${t}\n`;

test('guessLang detects language from subtitle text', () => {
  assert.strictEqual(DS.guessLang(srt('Bu ne için? Ben de bir şey bilmiyorum, çok garip değil mi?')), 'tr');
  assert.strictEqual(DS.guessLang(srt('What is it? I do not know, and that is the thing you want.')), 'en');
  assert.strictEqual(DS.guessLang(srt('Ich weiß nicht, das ist nicht die Antwort und du bist hier.')), 'de');
  assert.strictEqual(DS.guessLang(srt('Где ты был прошлой ночью?')), 'ru');
  assert.strictEqual(DS.guessLang(srt('12345')), '');
});

const TR = 'Bu ne için? Ben de bir şey bilmiyorum, çok garip değil mi? Sen bu işi ne zaman yaptın ve neden bana söylemedin? '.repeat(6);
const EN = 'What is it? I do not know, and that is the thing you want. Are you sure it was this? Do you have it? '.repeat(6);
const FR = 'Je ne sais pas ce que vous voulez. Il est là et une femme ne le dit pas. Le chat est un ami de la maison. '.repeat(6);

test('checkLang keeps the claimed language when the text agrees or is too short to judge', () => {
  assert.strictEqual(DS.checkLang(srt(TR), 'tr'), 'tr');
  assert.strictEqual(DS.checkLang(srt(EN), 'en'), 'en');
  assert.strictEqual(DS.checkLang(srt('ATİNA\'NIN TADI YUNAN MEYHANESİ'), 'tr'), 'tr');
  assert.strictEqual(DS.checkLang(srt('12345'), 'tr'), 'tr');
});

test('checkLang returns the real language when the text clearly is another one', () => {
  assert.strictEqual(DS.checkLang(srt(FR), 'tr'), 'fr');
  assert.strictEqual(DS.checkLang(srt(EN), 'tr'), 'en');
  assert.strictEqual(DS.checkLang(srt(TR), 'en'), 'tr');
  assert.strictEqual(DS.checkLang(srt('Где ты был прошлой ночью? Что ты делаешь?'), 'en'), 'ru');
});

test('checkLang trusts a language it has no word list for', () => {
  assert.strictEqual(DS.checkLang(srt('Ik weet het niet. Dat is een goed idee.'), 'nl'), 'nl');
});

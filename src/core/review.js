// Practice for the saved words: Leitner boxes with due dates, and question building. Pure; runs in Node too.
// A saved word is {word, translation, from, to, context, at, box?, due?}. No box = box 1, no due = due now.
(() => {
  const DS = (globalThis.DS ||= {});
  const DAY = 864e5;
  DS.REVIEW_DAYS = [1, 3, 7, 21]; // wait after a review, by the box the word is in afterwards
  DS.REVIEW_SESSION = 15;

  // Words due at `now`, longest overdue first, at most n.
  DS.dueWords = (words, now, n = DS.REVIEW_SESSION) =>
    words.filter(w => (w.due ?? 0) <= now).sort((a, b) => (a.due ?? 0) - (b.due ?? 0)).slice(0, n);

  // Right: one box up (max 4), next review after that box's wait. Wrong: back to box 1, tomorrow.
  DS.gradeWord = (w, correct, now) => {
    const box = correct ? Math.min(4, (w.box || 1) + 1) : 1;
    return { ...w, box, due: now + (correct ? DS.REVIEW_DAYS[box - 1] : DS.REVIEW_DAYS[0]) * DAY };
  };

  const shuffle = (a, rnd) => {
    const r = [...a];
    for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
    return r;
  };
  const pickOthers = (pool, n, rnd) => shuffle([...new Set(pool)], rnd).slice(0, n);
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // The sentence the word was saved from, with the word blanked; null when the word is not in it.
  DS.blankContext = (w) => {
    if (!w.context || !w.word) return null;
    const re = new RegExp(`(?<![\\p{L}])${esc(w.word)}(?![\\p{L}])`, 'iu');
    return re.test(w.context) ? w.context.replace(re, '____') : null;
  };

  // One question for `w`, distractors from the other saved words. Types:
  //   cloze: blanked sentence, pick the word; choice: the word, pick its translation; card: flip and self-grade (too few words for choices).
  DS.makeQuestion = (w, all, rnd = Math.random) => {
    const others = all.filter(x => x !== w && x.from === w.from && x.to === w.to);
    const blank = DS.blankContext(w);
    const words = pickOthers(others.map(x => x.word).filter(x => x.toLowerCase() !== w.word.toLowerCase()), 3, rnd);
    if (blank && words.length === 3 && rnd() < 0.5) {
      return { type: 'cloze', prompt: blank, hint: w.translation, options: shuffle([w.word, ...words], rnd), answer: w.word };
    }
    const trs = pickOthers(others.map(x => x.translation).filter(x => x && x !== w.translation), 3, rnd);
    if (trs.length === 3) return { type: 'choice', prompt: w.word, options: shuffle([w.translation, ...trs], rnd), answer: w.translation };
    return { type: 'card', prompt: w.word, answer: w.translation };
  };

  // A session: due words with their questions.
  DS.makeSession = (words, now, rnd = Math.random, n = DS.REVIEW_SESSION) =>
    DS.dueWords(words, now, n).map(w => ({ word: w, q: DS.makeQuestion(w, words, rnd) }));

  if (typeof module === 'object') module.exports = DS;
})();

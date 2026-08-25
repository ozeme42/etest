export function parseAnswerKeyString(str, questionCount = 20, optionCount = 5) {
  if (!str || typeof str !== 'string') return {};
  const cleanRegex = optionCount === 4 ? /[^A-Da-d]/g : /[^A-Ea-e]/g;
  const cleaned = str.replace(cleanRegex, '').toUpperCase();
  const answerKey = {};
  const maxQ = questionCount || cleaned.length || 20;
  for (let i = 0; i < Math.min(cleaned.length, maxQ); i++) {
    answerKey[String(i + 1)] = cleaned[i];
  }
  return answerKey;
}

export function sortTestsNaturally(testsArray) {
  if (!Array.isArray(testsArray)) return [];
  const getTestRank = (name = '') => {
    const s = String(name).toLowerCase().trim();
    if (s.startsWith('test') || s.startsWith('paragraf') || s.startsWith('problem')) return 1;
    if (s.includes('yeni nesil') || s.startsWith('yn')) return 2;
    if (s.includes('değ') || s.includes('degerlendirme') || s.includes('deneme')) return 3;
    return 2;
  };

  return [...testsArray].sort((a, b) => {
    const rankA = getTestRank(a.name);
    const rankB = getTestRank(b.name);
    if (rankA !== rankB) return rankA - rankB;
    return (a.name || '').localeCompare(b.name || '', 'tr', { numeric: true, sensitivity: 'base' });
  });
}

export function toUUID(val) {
  if (!val) return null;
  const s = String(val);
  if (s.length === 36 && s.includes('-')) return s;
  return null;
}

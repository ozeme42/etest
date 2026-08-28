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

  const getPageNum = (name = '') => {
    // Extract the first number from names like "9-10. Sayfa..." or "13-14. Sayfa..."
    const match = String(name).match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : 9999;
  };

  const getTestRank = (name = '') => {
    const s = String(name).toLowerCase().trim();
    // Within same page group: TEST < YENİ NESİL < DENEME
    if (s.includes('deneme')) return 3;
    if (s.includes('yeni nesil') || s.includes('yn')) return 2;
    return 1; // normal test / problem sayfası
  };

  return [...testsArray].sort((a, b) => {
    const pageA = getPageNum(a.name);
    const pageB = getPageNum(b.name);
    if (pageA !== pageB) return pageA - pageB;

    const rankA = getTestRank(a.name);
    const rankB = getTestRank(b.name);
    if (rankA !== rankB) return rankA - rankB;

    return (a.name || '').localeCompare(b.name || '', 'tr', { numeric: true, sensitivity: 'base' });
  });
}

export function toUUID(id) {
  if (!id) return null;
  const str = String(id);
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(str)) return str.toLowerCase();

  let hex = '';
  for (let i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16);
  }
  while (hex.length < 32) {
    hex += '0';
  }
  hex = hex.substring(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`.toLowerCase();
}

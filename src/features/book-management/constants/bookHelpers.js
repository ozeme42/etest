export function parseAnswerKeyString(str, questionCount = 20, optionCount = 5, startQNo = 1) {
  if (!str || typeof str !== 'string') return {};
  const cleanRegex = optionCount === 4 ? /[^A-Da-d]/g : /[^A-Ea-e]/g;
  const cleaned = str.replace(cleanRegex, '').toUpperCase();
  const answerKey = {};
  const maxQ = questionCount || cleaned.length || 20;
  const start = Number(startQNo) || 1;
  for (let i = 0; i < Math.min(cleaned.length, maxQ); i++) {
    answerKey[String(start + i)] = cleaned[i];
  }
  return answerKey;
}

export function sortTestsNaturally(testsArray) {
  if (!Array.isArray(testsArray)) return [];

  // 1. If tests have explicit orderIndex or order, strictly respect that sequence!
  const hasExplicitOrder = testsArray.some(t => t && (typeof t.orderIndex === 'number' || typeof t.order === 'number'));
  if (hasExplicitOrder) {
    return [...testsArray].sort((a, b) => {
      const ordA = typeof a?.orderIndex === 'number' ? a.orderIndex : (typeof a?.order === 'number' ? a.order : 999999);
      const ordB = typeof b?.orderIndex === 'number' ? b.orderIndex : (typeof b?.order === 'number' ? b.order : 999999);
      if (ordA !== ordB) return ordA - ordB;
      return (a?.name || '').localeCompare(b?.name || '', 'tr', { numeric: true, sensitivity: 'base' });
    });
  }

  // 2. Check for explicit page number indicators (e.g. "Sayfa 45", "9-10. Sayfa")
  const getPageNum = (name = '') => {
    const s = String(name || '');
    const pageMatch = s.match(/(?:sayfa|s\.)\s*(\d+)/i) || s.match(/^(\d+)\s*[-–]\s*\d+\.?\s*sayfa/i) || s.match(/^(\d+)\.?\s*sayfa/i);
    if (pageMatch) return parseInt(pageMatch[1], 10);
    return null;
  };

  return [...testsArray].sort((a, b) => {
    const pageA = getPageNum(a?.name);
    const pageB = getPageNum(b?.name);
    if (pageA !== null && pageB !== null && pageA !== pageB) {
      return pageA - pageB;
    }
    return (a?.name || '').localeCompare(b?.name || '', 'tr', { numeric: true, sensitivity: 'base' });
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

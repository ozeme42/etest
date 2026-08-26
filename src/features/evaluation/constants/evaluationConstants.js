export function detectSubject(title = '', existingSubject = '') {
  if (existingSubject && !['genel', 'diğer', 'all', ''].includes(String(existingSubject).toLowerCase().trim())) {
    return existingSubject;
  }
  const t = (String(title) + ' ' + String(existingSubject || '')).toLowerCase();
  if (t.includes('matematik') || t.includes('mat')) return 'Matematik';
  if (t.includes('fen')) return 'Fen Bilimleri';
  if (t.includes('türkçe') || t.includes('turkce') || t.includes('türk')) return 'Türkçe';
  if (t.includes('sosyal') || t.includes('inkılap') || t.includes('tarih')) return 'Sosyal Bilgiler';
  if (t.includes('ingilizce') || t.includes('english') || t.includes('ing')) return 'İngilizce';
  if (t.includes('din') || t.includes('ahlak') || t.includes('ilmihal') || t.includes('fıkıh') || t.includes('siyer') || t.includes('kuran')) return 'Din Kültürü';
  if (t.includes('deneme') || t.includes('lgs') || t.includes('tarama')) return 'Genel Deneme';
  return 'Genel Testler';
}

export const subjectThemes = {
  'Matematik': { bg: 'rgba(59, 130, 246, 0.18)', color: '#60a5fa', border: 'rgba(96, 165, 250, 0.35)', icon: '📐' },
  'Fen Bilimleri': { bg: 'rgba(16, 185, 129, 0.18)', color: '#34d399', border: 'rgba(52, 211, 153, 0.35)', icon: '🔬' },
  'Türkçe': { bg: 'rgba(244, 114, 182, 0.18)', color: '#f472b6', border: 'rgba(244, 114, 182, 0.35)', icon: '📚' },
  'Sosyal Bilgiler': { bg: 'rgba(192, 132, 252, 0.18)', color: '#c084fc', border: 'rgba(192, 132, 252, 0.35)', icon: '🌍' },
  'İngilizce': { bg: 'rgba(251, 113, 133, 0.18)', color: '#fb7185', border: 'rgba(251, 113, 133, 0.35)', icon: '🇬🇧' },
  'Din Kültürü': { bg: 'rgba(45, 212, 191, 0.18)', color: '#2dd4bf', border: 'rgba(45, 212, 191, 0.35)', icon: '🌙' },
  'Genel Deneme': { bg: 'rgba(99, 102, 241, 0.18)', color: '#a5b4fc', border: 'rgba(165, 180, 252, 0.35)', icon: '🏛️' },
  'Genel Testler': { bg: 'rgba(148, 163, 184, 0.18)', color: '#cbd5e1', border: 'rgba(203, 213, 225, 0.35)', icon: '📝' }
};

export const QUICK_FEEDBACK_PRESETS = [
  '👏 Çözüm yöntemi ve açıklama harika, tam puan!',
  '💡 Çözüm doğru ancak işlem adımlarına dikkat edilmeli.',
  '✍️ Açıklama biraz eksik kalmış, formülü belirtmelisin.',
  '⚠️ Yanlış formül veya kavram kullanılmış, tekrar gözden geçir.',
  '🌟 Gayet başarılı, tebrikler!'
];

export function isItemOpenEnded(item, ans) {
  if (ans?.userAnswerText && String(ans.userAnswerText).trim().length > 0) return true;
  if (!item) return false;
  if (Array.isArray(item.options) && item.options.length > 1 && !item.isOpenEnded) return false;
  if (item.questionType === 'coktan_secmeli' || item.type === 'coktan_secmeli' || item.formatType === 'coktan_secmeli') return false;
  if (item.isOpenEnded === true || item.openEnded === true) return true;
  const qType = String(item.questionType || item.type || item.contentType || '').toLowerCase();
  if (['acik_uclu', 'gorsel_klasik'].includes(qType)) return true;
  const title = String(item.title || item.name || item.questionText || item.text || '').toLowerCase();
  if (title.includes('açık uçlu') || title.includes('acik uclu') || title.includes('klasik soru') || title.includes('yazılı klasik')) return true;
  return false;
}

export function isValidPayloadString(str) {
  if (typeof str !== 'string') return false;
  const s = str.trim();
  if (s.length === 0) return false;
  if (s === '[STORED_IN_INDEXEDDB]' || s === '[LOCALSTORAGE_CACHE]') return false;
  return true;
}

// ─── MOTIVATIONAL QUOTES ───────────────────────────────────────────────────────
export const FOCUS_QUOTES = [
  "Büyük başarılar, her gün atılan küçük ve odaklı adımların toplamıdır.",
  "Şimdi gösterdiğin odaklanma, gelecekteki seni gururlandıracak.",
  "Dikkatini dağıtan şeyleri sustur; hedeflerinin sesini yükselt.",
  "Zor olan başlamaktır; başladığında odaklanma kendiliğinden akar.",
  "Her çözülen soru ve her biten seans, seni hedefine bir adım daha yaklaştırır.",
  "Bugün yapacağın fedakarlıklar, yarının özgürlüğü ve mutluluğudur.",
  "Önemli olan ne kadar çalıştığın değil, ne kadar odaklı çalıştığındır."
];

export const TREE_SPECIES = [
  { icon: '🌲', name: 'Çam Ağacı' },
  { icon: '🌳', name: 'Gürgen Ağacı' },
  { icon: '🌴', name: 'Palmiye' },
  { icon: '🎋', name: 'Bambu' },
  { icon: '🌸', name: 'Kiraz Çiçeği (Sakura)' },
  { icon: '🍎', name: 'Meyveli Elma Ağacı' }
];

// ─── THEMES ────────────────────────────────────────────────────────────────────
export const getThemeList = (isDark) => [
  {
    id: 'system',
    name: isDark ? '🌙 Sistem Karanlık' : '☀️ Sistem Aydınlık',
    bg: 'var(--color-bg)',
    cardBg: 'var(--color-surface)',
    innerBg: 'var(--color-surface-hover)',
    buttonBg: 'var(--color-surface-hover)',
    border: 'var(--color-border)',
    accent: '#6366f1',
    accentGradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
    opticalSelectedBg: isDark ? 'rgba(99, 102, 241, 0.18)' : 'rgba(99, 102, 241, 0.1)',
    opticalSelectedBorder: isDark ? 'rgba(129, 140, 248, 0.45)' : 'rgba(99, 102, 241, 0.35)',
    text: 'var(--color-text)',
    subText: 'var(--color-text-muted)',
    isDark: isDark
  },
  {
    id: 'cozy',
    name: '☕ Sıcak Oda',
    bg: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
    cardBg: 'rgba(30, 27, 75, 0.88)',
    innerBg: 'rgba(0, 0, 0, 0.28)',
    buttonBg: 'rgba(255, 255, 255, 0.12)',
    border: 'rgba(99, 102, 241, 0.35)',
    accent: '#818cf8',
    accentGradient: 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)',
    opticalSelectedBg: 'rgba(129, 140, 248, 0.22)',
    opticalSelectedBorder: 'rgba(129, 140, 248, 0.5)',
    text: '#ffffff',
    subText: '#c7d2fe',
    isDark: true
  },
  {
    id: 'zen',
    name: '🎋 Gece Zen',
    bg: 'linear-gradient(135deg, #090d16 0%, #0f172a 50%, #1e293b 100%)',
    cardBg: 'rgba(15, 23, 42, 0.88)',
    innerBg: 'rgba(0, 0, 0, 0.32)',
    buttonBg: 'rgba(255, 255, 255, 0.1)',
    border: 'rgba(148, 163, 184, 0.25)',
    accent: '#38bdf8',
    accentGradient: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
    opticalSelectedBg: 'rgba(56, 189, 248, 0.22)',
    opticalSelectedBorder: 'rgba(56, 189, 248, 0.5)',
    text: '#f8fafc',
    subText: '#94a3b8',
    isDark: true
  },
  {
    id: 'nature',
    name: '🌿 Orman',
    bg: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
    cardBg: 'rgba(6, 78, 59, 0.88)',
    innerBg: 'rgba(0, 0, 0, 0.28)',
    buttonBg: 'rgba(255, 255, 255, 0.12)',
    border: 'rgba(52, 211, 153, 0.35)',
    accent: '#34d399',
    accentGradient: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
    opticalSelectedBg: 'rgba(52, 211, 153, 0.22)',
    opticalSelectedBorder: 'rgba(52, 211, 153, 0.5)',
    text: '#ffffff',
    subText: '#a7f3d0',
    isDark: true
  },
  {
    id: 'sunset',
    name: '🌅 Günbatımı',
    bg: 'linear-gradient(135deg, #4c0519 0%, #831843 50%, #9d174d 100%)',
    cardBg: 'rgba(76, 5, 25, 0.88)',
    innerBg: 'rgba(0, 0, 0, 0.28)',
    buttonBg: 'rgba(255, 255, 255, 0.12)',
    border: 'rgba(244, 114, 182, 0.35)',
    accent: '#fb7185',
    accentGradient: 'linear-gradient(135deg, #fb7185 0%, #e11d48 100%)',
    opticalSelectedBg: 'rgba(251, 113, 133, 0.22)',
    opticalSelectedBorder: 'rgba(251, 113, 133, 0.5)',
    text: '#ffffff',
    subText: '#fbcfe8',
    isDark: true
  }
];

// ─── 📚 DERS LİSTESİ & VARSAYILAN HIZ STANDARTLARI ──────────────────────────
export const STUDY_SUBJECTS = [
  { id: 'Matematik', name: 'Matematik', icon: '📐', defaultMinPerQ: 2.0, color: '#6366f1' },
  { id: 'Fen Bilimleri', name: 'Fen Bilimleri (Fizik/Kimya/Biyo)', icon: '🔬', defaultMinPerQ: 1.5, color: '#10b981' },
  { id: 'Türkçe', name: 'Türkçe / Paragraf', icon: '📚', defaultMinPerQ: 1.25, color: '#f59e0b' },
  { id: 'T.C. İnkılap Tarihi', name: 'İnkılap Tarihi / Tarih', icon: '🏛️', defaultMinPerQ: 1.0, color: '#ec4899' },
  { id: 'Sosyal Bilgiler', name: 'Sosyal Bilgiler / Coğrafya', icon: '🌍', defaultMinPerQ: 1.0, color: '#06b6d4' },
  { id: 'Din Kültürü', name: 'Din Kültürü ve Ahlak Bilgisi', icon: '🕌', defaultMinPerQ: 0.8, color: '#8b5cf6' },
  { id: 'İngilizce', name: 'İngilizce / Yabancı Dil', icon: '🇬🇧', defaultMinPerQ: 1.0, color: '#3b82f6' },
  { id: 'Felsefe / Mantık', name: 'Felsefe / Mantık', icon: '🧠', defaultMinPerQ: 1.2, color: '#14b8a6' },
  { id: 'Genel / Karma', name: 'Genel Deneme / Karma', icon: '🎯', defaultMinPerQ: 1.5, color: '#f97316' }
];

export const formatSecToMinSec = (seconds) => {
  if (!seconds || seconds <= 0) return '0 sn';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s} sn`;
  if (s === 0) return `${m} dk`;
  return `${m} dk ${s.toString().padStart(2, '0')} sn`;
};

export const getSpeedEvaluation = (avgSec, defaultMinPerQ) => {
  const targetSec = (defaultMinPerQ || 1.5) * 60;
  if (!avgSec || avgSec <= 0) return { label: 'Henüz Veri Yok', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)', icon: '⚪' };
  if (avgSec <= targetSec * 0.8) return { label: 'Süper Hızlı', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', icon: '⚡' };
  if (avgSec <= targetSec * 1.15) return { label: 'İdeal Hız', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', icon: '🎯' };
  if (avgSec <= targetSec * 1.4) return { label: 'Standart', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', icon: '🟡' };
  return { label: 'Detaylı / Uzun', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', icon: '⏳' };
};

export const matchSubjectFromTask = (task) => {
  if (!task) return 'Matematik';
  const text = `${task.subject || ''} ${task.title || ''} ${task.text || ''} ${task.topic || ''} ${task.unit || ''} ${task.bookName || ''}`.toLowerCase();
  
  if (text.includes('mat') || text.includes('geo')) return 'Matematik';
  if (text.includes('fen') || text.includes('fizik') || text.includes('kimya') || text.includes('biyo')) return 'Fen Bilimleri';
  if (text.includes('türk') || text.includes('turk') || text.includes('paragraf') || text.includes('edebiyat') || text.includes('dil bilgisi')) return 'Türkçe';
  if (text.includes('inkılap') || text.includes('inkilap') || text.includes('tarih')) return 'T.C. İnkılap Tarihi';
  if (text.includes('sosyal') || text.includes('coğraf') || text.includes('cograf')) return 'Sosyal Bilgiler';
  if (text.includes('din') || text.includes('ahlak')) return 'Din Kültürü';
  if (text.includes('ing') || text.includes('eng') || text.includes('yabancı') || text.includes('yabanci')) return 'İngilizce';
  if (text.includes('felsefe') || text.includes('mantık') || text.includes('mantik') || text.includes('psikoloji') || text.includes('sosyoloji')) return 'Felsefe / Mantık';
  
  const found = STUDY_SUBJECTS.find(s => text.includes(s.id.toLowerCase()));
  if (found) return found.id;

  return 'Matematik';
};

export const extractQuestionCountFromTask = (task) => {
  if (!task) return 20;
  if (typeof task.questionCount === 'number' && task.questionCount > 0) return task.questionCount;
  if (typeof task.targetQuestions === 'number' && task.targetQuestions > 0) return task.targetQuestions;
  
  const str = `${task.questionCount || ''} ${task.targetQuestions || ''} ${task.text || ''} ${task.topic || ''} ${task.title || ''}`;
  const match = str.match(/(\d+)\s*(?:soru|q|test)?/i);
  if (match && parseInt(match[1], 10) > 0) {
    return parseInt(match[1], 10);
  }
  return 20;
};

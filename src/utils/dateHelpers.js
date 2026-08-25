import { parse, format, isPast, isToday, differenceInDays } from 'date-fns';
import { tr } from 'date-fns/locale';

/**
 * 📅 STANDARDIZED DATE & TIME HELPER UTILITIES (TURKEY TIMEZONE UTC+3 AWARE)
 */

/**
 * Returns 'YYYY-MM-DD' formatted date string in Turkey Time (Europe/Istanbul, UTC+3)
 * Handles ISO strings, timestamps, Date objects, and plain date strings safely.
 */
export const getTurkeyYMD = (dateInput = new Date()) => {
  if (!dateInput) return getTurkeyYMD(new Date());
  try {
    // If already in YYYY-MM-DD format, return it
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
      return dateInput.trim();
    }
    const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
    if (!d || isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);

    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(d);
  } catch (e) {
    const d = new Date(dateInput);
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const trDate = new Date(utc + (3600000 * 3));
    const year = trDate.getFullYear();
    const month = String(trDate.getMonth() + 1).padStart(2, '0');
    const day = String(trDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};

/**
 * Returns today's date in Turkey ('YYYY-MM-DD')
 */
export const getTurkeyToday = () => {
  return getTurkeyYMD(new Date());
};

/**
 * Returns Monday to Sunday date range for Turkey timezone ('YYYY-MM-DD')
 */
export const getTurkeyWeekRange = (refDate = new Date()) => {
  const ymd = getTurkeyYMD(refDate);
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay(); // 0 is Sunday
  const diffToMon = (day === 0 ? -6 : 1) - day;
  const monday = new Date(y, m - 1, d + diffToMon);
  const sunday = new Date(y, m - 1, d + diffToMon + 6);
  return {
    startYMD: getTurkeyYMD(monday),
    endYMD: getTurkeyYMD(sunday)
  };
};

/**
 * Returns 1st to last day of month range for Turkey timezone ('YYYY-MM-DD')
 */
export const getTurkeyMonthRange = (refDate = new Date()) => {
  const ymd = getTurkeyYMD(refDate);
  const [y, m] = ymd.split('-').map(Number);
  const firstDay = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDayObj = new Date(y, m, 0);
  const lastDay = `${y}-${String(m).padStart(2, '0')}-${String(lastDayObj.getDate()).padStart(2, '0')}`;
  return {
    startYMD: firstDay,
    endYMD: lastDay
  };
};

export const isTurkeyToday = (dateInput) => {
  if (!dateInput) return false;
  return getTurkeyYMD(dateInput) === getTurkeyToday();
};

export const isTurkeyThisWeek = (dateInput) => {
  if (!dateInput) return false;
  const ymd = getTurkeyYMD(dateInput);
  const { startYMD, endYMD } = getTurkeyWeekRange();
  return ymd >= startYMD && ymd <= endYMD;
};

export const isTurkeyThisMonth = (dateInput) => {
  if (!dateInput) return false;
  const ymd = getTurkeyYMD(dateInput);
  const { startYMD, endYMD } = getTurkeyMonthRange();
  return ymd >= startYMD && ymd <= endYMD;
};

export const parseSafeDate = (d) => {
  if (!d) return new Date();
  if (d instanceof Date) return d;
  const iso = new Date(d);
  if (!isNaN(iso.getTime())) return iso;
  try {
    return parse(d, 'dd MMMM yyyy', new Date(), { locale: tr });
  } catch {
    return new Date();
  }
};

export const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (isNaN(diff) || diff < 1) return 'az önce';
  if (diff < 60) return `${diff}dk önce`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `${h}s önce`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}g önce`;
  return formatTurkishDate(dateStr);
};

export const formatTurkishDate = (dateVal, formatStr = 'dd MMMM yyyy') => {
  if (!dateVal) return '';
  try {
    const d = parseSafeDate(dateVal);
    return format(d, formatStr, { locale: tr });
  } catch {
    return String(dateVal);
  }
};

export const getDueStatus = (rawDueDate, isDone = false) => {
  if (!rawDueDate) return { isOverdue: false, isDueToday: false, diffDays: null, dueLabel: '' };
  
  try {
    const dueDate = new Date(rawDueDate);
    if (isNaN(dueDate.getTime())) {
      return { isOverdue: false, isDueToday: false, diffDays: null, dueLabel: String(rawDueDate) };
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dueDate);
    target.setHours(0, 0, 0, 0);
    
    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const isOverdue = diffDays < 0 && !isDone;
    const isDueToday = diffDays === 0 && !isDone;
    const dueLabel = dueDate.toLocaleDateString('tr-TR');
    
    return { isOverdue, isDueToday, diffDays, dueLabel };
  } catch {
    return { isOverdue: false, isDueToday: false, diffDays: null, dueLabel: '' };
  }
};


/**
 * Intelligently extracts the accurate historical completion date of any submission or test item.
 * Automatically recovers timestamps embedded in IDs (e.g. sub_1787430618712 or sub_manual_1786523912000)
 * when migration dates default to today.
 */
export const extractItemDate = (s) => {
  if (!s) return getTurkeyToday();
  const todayYMD = getTurkeyToday();

  const raw = (s && typeof s === 'object') ? (s.raw_data || {}) : {};
  const meta = (s && typeof s === 'object' && s.answers && Array.isArray(s.answers)) ? s.answers.find(a => a.type === 'metadata') : null;

  // 1. Helper to extract embedded epoch timestamp from submission ID / meta.realId / meta.submissionId
  const getEmbeddedTsDate = () => {
    const idCandidates = [
      String(meta?.realId || ''),
      String(meta?.submissionId || ''),
      String(s.originalSubmissionId || ''),
      String(s.submissionId || ''),
      String(s.id || ''),
      String(s.supabaseId || ''),
      String(raw.id || '')
    ];

    for (const idStr of idCandidates) {
      if (idStr.startsWith('tbt_') || idStr.startsWith('tb_') || idStr.startsWith('hw_')) continue;
      const matchTs = idStr.match(/sub_(?:manual_)?(\d{12,13})/i) || idStr.match(/(\d{12,13})/);
      if (matchTs) {
        const tsNum = Number(matchTs[1]);
        if (tsNum > 1600000000000 && tsNum < 2000000000000) {
          return getTurkeyYMD(new Date(tsNum));
        }
      }
    }
    return null;
  };

  // 2. Explicit date candidates
  const explicitCandidates = [
    meta?.submittedAt,
    meta?.completedAt,
    meta?.date,
    meta?.createdAt,
    s.submittedAt,
    s.submitted_at,
    s.completedAt,
    s.completed_at,
    raw.submittedAt,
    raw.submitted_at,
    raw.completedAt,
    raw.date
  ];

  // Check if any explicit date has a distinct historical date (not today)
  for (const exp of explicitCandidates) {
    if (exp && String(exp).trim()) {
      const expYMD = getTurkeyYMD(String(exp).trim());
      if (expYMD && expYMD !== todayYMD) {
        return expYMD;
      }
    }
  }

  // If explicit date was today (or missing), check if an older embedded timestamp exists in ID
  const embedded = (typeof s === 'object') ? getEmbeddedTsDate() : null;
  if (embedded) return embedded;

  // If no embedded timestamp, use the explicit date (including today)
  for (const exp of explicitCandidates) {
    if (exp && String(exp).trim()) {
      const expYMD = getTurkeyYMD(String(exp).trim());
      if (expYMD) return expYMD;
    }
  }

  const fallback = s.date || s.createdAt || s.created_at || raw.createdAt;
  if (fallback) {
    const fYMD = getTurkeyYMD(fallback);
    return fYMD || todayYMD;
  }

  return todayYMD;
};

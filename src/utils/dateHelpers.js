import { parse, format, isPast, isToday, differenceInDays } from 'date-fns';
import { tr } from 'date-fns/locale';

/**
 * 📅 STANDARDIZED DATE & TIME HELPER UTILITIES (TURKEY TIMEZONE UTC+3 AWARE)
 */

const TURKISH_MONTHS = {
  'ocak': '01', 'oca': '01',
  'şubat': '02', 'subat': '02', 'şub': '02', 'sub': '02',
  'mart': '03', 'mar': '03',
  'nisan': '04', 'nis': '04',
  'mayıs': '05', 'mayis': '05', 'may': '05',
  'haziran': '06', 'haz': '06',
  'temmuz': '07', 'tem': '07',
  'ağustos': '08', 'agustos': '08', 'ağu': '08', 'agu': '08',
  'eylül': '09', 'eylul': '09', 'eyl': '09',
  'ekim': '10', 'eki': '10',
  'kasım': '11', 'kasim': '11', 'kas': '11',
  'aralık': '12', 'aralik': '12', 'ara': '12'
};

function getTurkeyTodayFallback() {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/**
 * Returns 'YYYY-MM-DD' formatted date string in Turkey Time (Europe/Istanbul, UTC+3)
 * Safely handles:
 * - ISO strings ('2026-08-24T12:00:00Z', '2026-08-24')
 * - Turkish dot/slash/dash strings ('24.08.2026', '24/08/2026', '24-08-2026')
 * - Turkish month names ('24 Ağustos 2026', '22 Ağu 2026', '24 Ağustos')
 * - Epoch timestamps in milliseconds or seconds (number or numeric string)
 * - JavaScript Date objects
 */
export const getTurkeyYMD = (dateInput = new Date()) => {
  if (!dateInput && dateInput !== 0) return getTurkeyTodayFallback();
  try {
    // 1. Date object
    if (dateInput instanceof Date) {
      if (isNaN(dateInput.getTime())) return getTurkeyTodayFallback();
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Istanbul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      return formatter.format(dateInput);
    }

    // 2. Numeric timestamp
    if (typeof dateInput === 'number') {
      const ts = dateInput < 10000000000 ? dateInput * 1000 : dateInput;
      const d = new Date(ts);
      if (!isNaN(d.getTime())) return getTurkeyYMD(d);
    }

    // 3. String dateInput
    if (typeof dateInput === 'string') {
      const str = dateInput.trim();
      if (!str) return getTurkeyTodayFallback();

      // Check ISO YYYY-MM-DD
      const ymdMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (ymdMatch) {
        return `${ymdMatch[1]}-${ymdMatch[2]}-${ymdMatch[3]}`;
      }

      // Check numeric timestamp as string (e.g. "1787430618712")
      if (/^\d{10,13}$/.test(str)) {
        const ts = Number(str);
        const d = new Date(ts < 10000000000 ? ts * 1000 : ts);
        if (!isNaN(d.getTime())) return getTurkeyYMD(d);
      }

      // Check DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY
      const dmyMatch = str.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
      if (dmyMatch) {
        const day = dmyMatch[1].padStart(2, '0');
        const month = dmyMatch[2].padStart(2, '0');
        const year = dmyMatch[3];
        return `${year}-${month}-${day}`;
      }

      // Check Turkish month format (e.g. "24 Ağustos 2026" or "22 Ağu 2026" or "24 Ağustos")
      const trMonthMatch = str.match(/^(\d{1,2})\s+([a-zA-ZğüşıöçĞÜŞİÖÇ]+)(?:\s+(\d{4}))?/i);
      if (trMonthMatch) {
        const day = trMonthMatch[1].padStart(2, '0');
        const mKey = trMonthMatch[2].toLowerCase();
        const year = trMonthMatch[3] || new Date().getFullYear();
        const month = TURKISH_MONTHS[mKey];
        if (month) {
          return `${year}-${month}-${day}`;
        }
      }

      // Fallback to new Date(str)
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        const formatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Europe/Istanbul',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        return formatter.format(d);
      }
    }
  } catch (e) {}

  return getTurkeyTodayFallback();
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
  const [y, m, d] = ymd.split('-').map(Number);
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
  const ymd = getTurkeyYMD(d);
  const [y, m, day] = ymd.split('-').map(Number);
  return new Date(y, m - 1, day);
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
 * Strictly reads genuine solve timestamps (submittedAt, date, created_at) from Supabase / state
 * and strictly ignores book test authoring IDs (tbt_...).
 */
export const extractItemDate = (s) => {
  if (!s) return getTurkeyToday();

  // If s is a Date instance
  if (s instanceof Date) {
    return getTurkeyYMD(s);
  }
  // If s is a numeric timestamp
  if (typeof s === 'number') {
    return getTurkeyYMD(s);
  }
  // If s is a string formatted as date / ISO
  if (typeof s === 'string') {
    const trimmed = s.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed) || /^\d{1,2}[./-]\d{1,2}[./-]\d{4}/.test(trimmed) || trimmed.includes('T') || trimmed.includes('Z')) {
      const parsedYMD = getTurkeyYMD(trimmed);
      if (parsedYMD) return parsedYMD;
    }
  }

  const raw = (s && typeof s === 'object') ? (s.raw_data || {}) : {};
  let answersList = (s && s.answers) ? s.answers : null;
  if (typeof answersList === 'string') {
    try { answersList = JSON.parse(answersList); } catch {}
  }
  const meta = (answersList && Array.isArray(answersList)) ? answersList.find(a => a?.type === 'metadata') : ((s && s.metadata) || {});

  // 1. FIRST PRIORITY: Genuine explicit submission & completion timestamps
  const explicitSolveTimestamps = [
    meta?.submittedAt,
    meta?.completedAt,
    meta?.date,
    s.submittedAt,
    s.submitted_at,
    s.completedAt,
    s.completed_at,
    s.date,
    raw.submittedAt,
    raw.submitted_at,
    raw.completedAt,
    raw.completed_at,
    raw.date
  ];

  for (const exp of explicitSolveTimestamps) {
    if (exp && String(exp).trim()) {
      const expYMD = getTurkeyYMD(String(exp).trim());
      if (expYMD) return expYMD;
    }
  }

  // 2. SECOND PRIORITY: Pure submission ID with epoch timestamp (e.g. sub_1787..., me_1787...)
  const subIdCandidates = [
    String(meta?.realId || ''),
    String(meta?.submissionId || ''),
    String(s.originalSubmissionId || ''),
    String(s.submissionId || ''),
    String(s.id || ''),
    String(raw.id || '')
  ];

  for (const idStr of subIdCandidates) {
    if (!idStr) continue;
    if (idStr.includes('tbt') || idStr.includes('bt_') || idStr.includes('hw_') || idStr.includes('tb_')) continue;

    const matchSubTs = idStr.match(/(?:sub_|me_|manual_)?(\d{12,13})/i);
    if (matchSubTs) {
      const tsNum = Number(matchSubTs[1]);
      if (tsNum > 1650000000000 && tsNum < 2000000000000) {
        const extractedYMD = getTurkeyYMD(new Date(tsNum));
        if (extractedYMD) return extractedYMD;
      }
    }
  }

  // 3. THIRD PRIORITY: DB row created_at timestamp
  const dbCreatedTimestamps = [
    s.created_at,
    s.createdAt,
    raw.created_at,
    raw.createdAt,
    meta?.createdAt
  ];

  for (const exp of dbCreatedTimestamps) {
    if (exp && String(exp).trim()) {
      const expYMD = getTurkeyYMD(String(exp).trim());
      if (expYMD) return expYMD;
    }
  }

  return getTurkeyToday();
};

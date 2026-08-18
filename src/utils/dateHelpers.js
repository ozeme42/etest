import { parse, format, isPast, isToday, differenceInDays } from 'date-fns';
import { tr } from 'date-fns/locale';

/**
 * 📅 STANDARDIZED DATE & TIME HELPER UTILITIES
 */

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

import {
  Ruler, TestTube2, BookCopy, Globe, MessageSquare,
  Compass, Heart, Award, FileText
} from 'lucide-react';

/**
 * 🎨 STANDARDIZED SUBJECT DESIGN THEMES & COLOR PALETTES
 * Provides consistent colors, badges, pastel row backgrounds, and icons across the entire platform.
 */

export const SUBJECT_THEMES = {
  'Matematik': {
    name: 'Matematik',
    icon: Ruler,
    color: '#2563eb',
    accent: '#3b82f6',
    bg: '#eff6ff',
    border: '#bfdbfe',
    badgeBg: '#dbeafe',
    text: '#1e40af',
    darkBg: 'rgba(59, 130, 246, 0.15)',
    darkBorder: 'rgba(59, 130, 246, 0.35)',
    gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
  },
  'Fen Bilimleri': {
    name: 'Fen Bilimleri',
    icon: TestTube2,
    color: '#059669',
    accent: '#10b981',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    badgeBg: '#dcfce7',
    text: '#065f46',
    darkBg: 'rgba(16, 185, 129, 0.15)',
    darkBorder: 'rgba(16, 185, 129, 0.35)',
    gradient: 'linear-gradient(135deg, #10b981, #047857)'
  },
  'Türkçe': {
    name: 'Türkçe',
    icon: BookCopy,
    color: '#ea580c',
    accent: '#f97316',
    bg: '#fff7ed',
    border: '#fed7aa',
    badgeBg: '#ffedd5',
    text: '#9a3412',
    darkBg: 'rgba(249, 115, 22, 0.15)',
    darkBorder: 'rgba(249, 115, 22, 0.35)',
    gradient: 'linear-gradient(135deg, #f97316, #c2410c)'
  },
  'Sosyal Bilgiler': {
    name: 'Sosyal Bilgiler',
    icon: Globe,
    color: '#7c3aed',
    accent: '#8b5cf6',
    bg: '#faf5ff',
    border: '#e9d5ff',
    badgeBg: '#f3e8ff',
    text: '#6b21a8',
    darkBg: 'rgba(139, 92, 246, 0.15)',
    darkBorder: 'rgba(139, 92, 246, 0.35)',
    gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)'
  },
  'T.C. İnkılap Tarihi ve Atatürkçülük': {
    name: 'T.C. İnkılap Tarihi',
    icon: Compass,
    color: '#b91c1c',
    accent: '#ef4444',
    bg: '#fef2f2',
    border: '#fecaca',
    badgeBg: '#fee2e2',
    text: '#991b1b',
    darkBg: 'rgba(239, 68, 68, 0.15)',
    darkBorder: 'rgba(239, 68, 68, 0.35)',
    gradient: 'linear-gradient(135deg, #ef4444, #b91c1c)'
  },
  'İngilizce': {
    name: 'İngilizce',
    icon: MessageSquare,
    color: '#e11d48',
    accent: '#f43f5e',
    bg: '#fff1f2',
    border: '#fecdd3',
    badgeBg: '#ffe4e6',
    text: '#9f1239',
    darkBg: 'rgba(244, 63, 94, 0.15)',
    darkBorder: 'rgba(244, 63, 94, 0.35)',
    gradient: 'linear-gradient(135deg, #f43f5e, #be123c)'
  },
  'Din Kültürü ve Ahlak Bilgisi': {
    name: 'Din Kültürü',
    icon: Heart,
    color: '#0d9488',
    accent: '#14b8a6',
    bg: '#f0fdfa',
    border: '#99f6e4',
    badgeBg: '#ccfbf1',
    text: '#115e59',
    darkBg: 'rgba(20, 184, 166, 0.15)',
    darkBorder: 'rgba(20, 184, 166, 0.35)',
    gradient: 'linear-gradient(135deg, #14b8a6, #0f766e)'
  },
  'Genel Deneme': {
    name: 'Genel Deneme',
    icon: Award,
    color: '#4f46e5',
    accent: '#6366f1',
    bg: '#eef2ff',
    border: '#c7d2fe',
    badgeBg: '#e0e7ff',
    text: '#3730a3',
    darkBg: 'rgba(99, 102, 241, 0.15)',
    darkBorder: 'rgba(99, 102, 241, 0.35)',
    gradient: 'linear-gradient(135deg, #6366f1, #4338ca)'
  },
  'Diğer': {
    name: 'Genel',
    icon: FileText,
    color: '#475569',
    accent: '#64748b',
    bg: '#f8fafc',
    border: '#e2e8f0',
    badgeBg: '#f1f5f9',
    text: '#334155',
    darkBg: 'rgba(100, 116, 139, 0.15)',
    darkBorder: 'rgba(100, 116, 139, 0.35)',
    gradient: 'linear-gradient(135deg, #64748b, #475569)'
  }
};

/**
 * Fallback Row Pastel Palettes for alternating list rows
 */
export const FALLBACK_ROW_PALETTES = [
  { bg: '#f0f7ff', border: '#bfdbfe', accent: '#3b82f6', badgeBg: '#dbeafe', text: '#1d4ed8' },
  { bg: '#f0fdf4', border: '#bbf7d0', accent: '#10b981', badgeBg: '#dcfce7', text: '#047857' },
  { bg: '#fff7ed', border: '#fed7aa', accent: '#f97316', badgeBg: '#ffedd5', text: '#c2410c' },
  { bg: '#faf5ff', border: '#e9d5ff', accent: '#8b5cf6', badgeBg: '#f3e8ff', text: '#6d28d9' },
  { bg: '#fff1f2', border: '#fecdd3', accent: '#f43f5e', badgeBg: '#ffe4e6', text: '#be123c' },
  { bg: '#f0fdfa', border: '#99f6e4', accent: '#14b8a6', badgeBg: '#ccfbf1', text: '#0f766e' },
  { bg: '#fffbeb', border: '#fde68a', accent: '#f59e0b', badgeBg: '#fef3c7', text: '#b45309' }
];

/**
 * Avatar Color Gradients for Users and Students
 */
export const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #6366f1, #8b5cf6)',
  'linear-gradient(135deg, #38bdf8, #0284c7)',
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #ec4899, #8b5cf6)',
  'linear-gradient(135deg, #14b8a6, #6366f1)',
  'linear-gradient(135deg, #8b5cf6, #d946ef)'
];

export const getAvatarBg = (index = 0) => AVATAR_GRADIENTS[Math.abs(index) % AVATAR_GRADIENTS.length];

/**
 * Normalized Subject Theme Matcher
 */
export function getSubjectTheme(subjectName = '', fallbackIndex = 0) {
  if (!subjectName) return FALLBACK_ROW_PALETTES[fallbackIndex % FALLBACK_ROW_PALETTES.length];
  
  const s = String(subjectName).toLowerCase().trim();
  
  if (s.includes('matematik')) return SUBJECT_THEMES['Matematik'];
  if (s.includes('fen')) return SUBJECT_THEMES['Fen Bilimleri'];
  if (s.includes('türkçe') || s.includes('turkce')) return SUBJECT_THEMES['Türkçe'];
  if (s.includes('inkılap') || s.includes('inkilap') || s.includes('tarih')) return SUBJECT_THEMES['T.C. İnkılap Tarihi ve Atatürkçülük'];
  if (s.includes('sosyal')) return SUBJECT_THEMES['Sosyal Bilgiler'];
  if (s.includes('ingilizce')) return SUBJECT_THEMES['İngilizce'];
  if (s.includes('din') || s.includes('ahlak')) return SUBJECT_THEMES['Din Kültürü ve Ahlak Bilgisi'];
  if (s.includes('deneme') || s.includes('genel') || s.includes('lgs') || s.includes('bursluluk')) return SUBJECT_THEMES['Genel Deneme'];
  
  return SUBJECT_THEMES[subjectName] || FALLBACK_ROW_PALETTES[fallbackIndex % FALLBACK_ROW_PALETTES.length];
}

/**
 * Clean Assignment Title (Removes repetitive book title prefixes)
 */
export function cleanAssignmentTitle(rawTitle = '', bookTitle = '', testName = '') {
  let title = rawTitle || testName || 'Ödev Görevi';
  if (bookTitle && title.toLowerCase().includes(bookTitle.toLowerCase())) {
    const regex = new RegExp(bookTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    title = title.replace(regex, '').replace(/^[\s\—\-\:\/]+/, '').trim();
    if (!title) title = testName || rawTitle;
  }
  return title;
}

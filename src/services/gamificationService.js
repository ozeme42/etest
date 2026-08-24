/**
 * Gamification Service
 * Scaled XP System (1/10th scale) with 35+ Comprehensive Badges & Achievements,
 * Fully Synchronized with Homeworks, Tracked Book Tests, Standalone Quizzes, and Mock Exams.
 */

import { computeStudentAnalyticsData } from '../utils/testResolver';

export const LEVEL_TIERS = [
  { level: 1, title: 'Acemi', minXp: 0, maxXp: 150, icon: '🥉', color: '#94a3b8', bgGradient: 'linear-gradient(135deg, #64748b, #475569)' },
  { level: 2, title: 'Çırak', minXp: 150, maxXp: 350, icon: '🔨', color: '#64748b', bgGradient: 'linear-gradient(135deg, #475569, #334155)' },
  { level: 3, title: 'Yolcu', minXp: 350, maxXp: 700, icon: '🧭', color: '#38bdf8', bgGradient: 'linear-gradient(135deg, #0284c7, #0369a1)' },
  { level: 4, title: 'Kaşif', minXp: 700, maxXp: 1200, icon: '🔭', color: '#34d399', bgGradient: 'linear-gradient(135deg, #059669, #047857)' },
  { level: 5, title: 'Muhafız', minXp: 1200, maxXp: 1900, icon: '🛡️', color: '#10b981', bgGradient: 'linear-gradient(135deg, #10b981, #047857)' },
  { level: 6, title: 'Savaşçı', minXp: 1900, maxXp: 2800, icon: '⚔️', color: '#fbbf24', bgGradient: 'linear-gradient(135deg, #d97706, #b45309)' },
  { level: 7, title: 'Şövalye', minXp: 2800, maxXp: 3900, icon: '🏇', color: '#f59e0b', bgGradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
  { level: 8, title: 'Usta', minXp: 3900, maxXp: 5200, icon: '🏹', color: '#fb7185', bgGradient: 'linear-gradient(135deg, #e11d48, #be123c)' },
  { level: 9, title: 'Üstat', minXp: 5200, maxXp: 6800, icon: '🔮', color: '#a78bfa', bgGradient: 'linear-gradient(135deg, #7c3aed, #5b21b6)' },
  { level: 10, title: 'Başkumandan', minXp: 6800, maxXp: 8800, icon: '🎖️', color: '#8b5cf6', bgGradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' },
  { level: 11, title: 'Efsane', minXp: 8800, maxXp: 11500, icon: '⚡', color: '#f43f5e', bgGradient: 'linear-gradient(135deg, #f43f5e, #e11d48)' },
  { level: 12, title: 'Bilge', minXp: 11500, maxXp: 15000, icon: '📜', color: '#06b6d4', bgGradient: 'linear-gradient(135deg, #0891b2, #0e7490)' },
  { level: 13, title: 'Kadim Hükümdar', minXp: 15000, maxXp: 20000, icon: '👑', color: '#eab308', bgGradient: 'linear-gradient(135deg, #eab308, #ca8a04)' },
  { level: 14, title: 'Evrenin Zirvesi', minXp: 20000, maxXp: 999999, icon: '🌌', color: '#ec4899', bgGradient: 'linear-gradient(135deg, #ec4899, #be185d)' }
];

export function normalizeCanonicalSubject(subjectName) {
  if (!subjectName || typeof subjectName !== 'string') return 'Genel';
  const lower = subjectName.toLowerCase().trim();
  if (lower.includes('matematik') || lower.includes('geometri')) return 'Matematik';
  if (lower.includes('fen') || lower.includes('fizik') || lower.includes('kimya') || lower.includes('biyoloji')) return 'Fen Bilimleri';
  if (lower.includes('türkçe') || lower.includes('turkce') || lower.includes('edebiyat') || lower.includes('paragraf') || lower.includes('dil bilgisi')) return 'Türkçe';
  if (lower.includes('sosyal') || lower.includes('inkılap') || lower.includes('tarih') || lower.includes('coğrafya') || lower.includes('felsefe')) return 'Sosyal & İnkılap';
  if (lower.includes('ingilizce') || lower.includes('english') || lower.includes('yabancı dil')) return 'İngilizce';
  if (lower.includes('din') || lower.includes('ahlak')) return 'Din Kültürü';
  return subjectName.trim();
}

export const BADGE_DEFINITIONS = [
  // ─── TEST & SINAV BAŞARILARI ───
  {
    id: 'first_step',
    title: 'İlk Adım',
    desc: 'İlk testini veya ödevini başarıyla tamamla.',
    icon: '🎯',
    category: 'test',
    xpReward: 5,
    check: (stats) => stats.totalSolvedTests >= 1,
    progress: (stats) => ({ current: Math.min(1, stats.totalSolvedTests), target: 1 })
  },
  {
    id: 'test_5',
    title: 'Isınma Turları',
    desc: 'Toplam 5 farklı test veya ödev tamamla.',
    icon: '🏃',
    category: 'test',
    xpReward: 8,
    check: (stats) => stats.totalSolvedTests >= 5,
    progress: (stats) => ({ current: Math.min(5, stats.totalSolvedTests), target: 5 })
  },
  {
    id: 'test_15',
    title: 'Sınav Maratoncusu',
    desc: 'Toplam 15 farklı test veya ödev tamamla.',
    icon: '🎽',
    category: 'test',
    xpReward: 15,
    check: (stats) => stats.totalSolvedTests >= 15,
    progress: (stats) => ({ current: Math.min(15, stats.totalSolvedTests), target: 15 })
  },
  {
    id: 'test_30',
    title: 'Sınav Şampiyonu',
    desc: 'Toplam 30 farklı test veya ödev tamamla.',
    icon: '🏆',
    category: 'test',
    xpReward: 25,
    check: (stats) => stats.totalSolvedTests >= 30,
    progress: (stats) => ({ current: Math.min(30, stats.totalSolvedTests), target: 30 })
  },
  {
    id: 'perfect_score',
    title: 'Keskin Nişancı',
    desc: 'Bir testte tüm soruları %100 doğru yap.',
    icon: '🎖️',
    category: 'accuracy',
    xpReward: 10,
    check: (stats) => stats.perfectTestsCount >= 1,
    progress: (stats) => ({ current: Math.min(1, stats.perfectTestsCount), target: 1 })
  },
  {
    id: 'perfect_3',
    title: 'Üçte Üç',
    desc: '3 farklı testte %100 tam doğru yap.',
    icon: '💎',
    category: 'accuracy',
    xpReward: 20,
    check: (stats) => stats.perfectTestsCount >= 3,
    progress: (stats) => ({ current: Math.min(3, stats.perfectTestsCount), target: 3 })
  },
  {
    id: 'high_accuracy',
    title: 'Usta Çözücü',
    desc: 'En az 5 testte %90 ve üzeri başarı elde et.',
    icon: '✨',
    category: 'accuracy',
    xpReward: 15,
    check: (stats) => stats.highAccuracyTests >= 5,
    progress: (stats) => ({ current: Math.min(5, stats.highAccuracyTests), target: 5 })
  },

  // ─── KİTAP TAKİBİ & ÖDEV BAŞARILARI ───
  {
    id: 'book_worm_1',
    title: 'Kitap Kurdu',
    desc: 'Kitap takibinden en az 3 kitap testi tamamla.',
    icon: '📚',
    category: 'test',
    xpReward: 8,
    check: (stats) => stats.bookTestsSolvedCount >= 3,
    progress: (stats) => ({ current: Math.min(3, stats.bookTestsSolvedCount), target: 3 })
  },
  {
    id: 'book_worm_2',
    title: 'Kitap Avcısı',
    desc: 'Kitap takibinden toplam 10 kitap testi tamamla.',
    icon: '📖',
    category: 'test',
    xpReward: 18,
    check: (stats) => stats.bookTestsSolvedCount >= 10,
    progress: (stats) => ({ current: Math.min(10, stats.bookTestsSolvedCount), target: 10 })
  },
  {
    id: 'book_worm_3',
    title: 'Kütüphane Fatihi',
    desc: 'Kitap takibinden toplam 25 kitap testi tamamla.',
    icon: '🏰',
    category: 'test',
    xpReward: 35,
    check: (stats) => stats.bookTestsSolvedCount >= 25,
    progress: (stats) => ({ current: Math.min(25, stats.bookTestsSolvedCount), target: 25 })
  },
  {
    id: 'hw_master_1',
    title: 'Ödev Sorumlusu',
    desc: 'Ödev modülünden en az 3 ödev tamamla.',
    icon: '📝',
    category: 'test',
    xpReward: 8,
    check: (stats) => stats.homeworksSolvedCount >= 3,
    progress: (stats) => ({ current: Math.min(3, stats.homeworksSolvedCount), target: 3 })
  },
  {
    id: 'hw_master_2',
    title: 'Ödev Şampiyonu',
    desc: 'Ödev modülünden toplam 10 ödev tamamla.',
    icon: '🎯',
    category: 'test',
    xpReward: 18,
    check: (stats) => stats.homeworksSolvedCount >= 10,
    progress: (stats) => ({ current: Math.min(10, stats.homeworksSolvedCount), target: 10 })
  },

  // ─── SORU SAYISI KİLOMETRE TAŞLARI ───
  {
    id: 'q_25',
    title: 'Soru Avcısı',
    desc: 'Tüm kaynaklardan toplam 25 soru çöz.',
    icon: '🏹',
    category: 'milestone',
    xpReward: 4,
    check: (stats) => stats.totalQuestionsSolved >= 25,
    progress: (stats) => ({ current: Math.min(25, stats.totalQuestionsSolved), target: 25 })
  },
  {
    id: 'q_50',
    title: 'Çırak Çözücü',
    desc: 'Toplam 50 soru çöz.',
    icon: '📜',
    category: 'milestone',
    xpReward: 8,
    check: (stats) => stats.totalQuestionsSolved >= 50,
    progress: (stats) => ({ current: Math.min(50, stats.totalQuestionsSolved), target: 50 })
  },
  {
    id: 'q_100',
    title: 'Yüzbaşı',
    desc: 'Toplam 100 soru çözerek ilk büyük barajı aş.',
    icon: '🛡️',
    category: 'milestone',
    xpReward: 15,
    check: (stats) => stats.totalQuestionsSolved >= 100,
    progress: (stats) => ({ current: Math.min(100, stats.totalQuestionsSolved), target: 100 })
  },
  {
    id: 'q_250',
    title: 'Çelik İrade',
    desc: 'Toplam 250 soru çöz.',
    icon: '⚔️',
    category: 'milestone',
    xpReward: 20,
    check: (stats) => stats.totalQuestionsSolved >= 250,
    progress: (stats) => ({ current: Math.min(250, stats.totalQuestionsSolved), target: 250 })
  },
  {
    id: 'q_500',
    title: 'Soru Canavarı',
    desc: 'Toplam 500 soru çöz.',
    icon: '👑',
    category: 'milestone',
    xpReward: 30,
    check: (stats) => stats.totalQuestionsSolved >= 500,
    progress: (stats) => ({ current: Math.min(500, stats.totalQuestionsSolved), target: 500 })
  },
  {
    id: 'q_1000',
    title: 'Efsanevi Çözücü',
    desc: 'Toplam 1.000 soru çözerek efsaneler arasına gir.',
    icon: '🌟',
    category: 'milestone',
    xpReward: 50,
    check: (stats) => stats.totalQuestionsSolved >= 1000,
    progress: (stats) => ({ current: Math.min(1000, stats.totalQuestionsSolved), target: 1000 })
  },

  // ─── DERS ODAKLI UZMANLIKLAR (100 DOĞRUDAN BAŞLAYAN ZORLU KADEMELER) ───
  // MATEMATİK
  {
    id: 'math_apprentice',
    title: 'Matematik Çırağı',
    desc: 'Matematik dersinde toplam 100 doğru soruya ulaş.',
    icon: '📐',
    category: 'subject',
    xpReward: 10,
    check: (stats) => (stats.subjectCorrect?.['Matematik'] || 0) >= 100,
    progress: (stats) => ({ current: Math.min(100, stats.subjectCorrect?.['Matematik'] || 0), target: 100 })
  },
  {
    id: 'math_explorer',
    title: 'Matematik Kaşifi',
    desc: 'Matematik dersinde toplam 250 doğru soruya ulaş.',
    icon: '📐',
    category: 'subject',
    xpReward: 25,
    check: (stats) => (stats.subjectCorrect?.['Matematik'] || 0) >= 250,
    progress: (stats) => ({ current: Math.min(250, stats.subjectCorrect?.['Matematik'] || 0), target: 250 })
  },
  {
    id: 'math_wizard',
    title: 'Matematik Dehası',
    desc: 'Matematik dersinde toplam 500 doğru soruya ulaş.',
    icon: '🧮',
    category: 'subject',
    xpReward: 50,
    check: (stats) => (stats.subjectCorrect?.['Matematik'] || 0) >= 500,
    progress: (stats) => ({ current: Math.min(500, stats.subjectCorrect?.['Matematik'] || 0), target: 500 })
  },
  {
    id: 'math_master',
    title: 'Matematik Üstadı',
    desc: 'Matematik dersinde toplam 1.000 doğru soruya ulaş.',
    icon: '👑',
    category: 'subject',
    xpReward: 100,
    check: (stats) => (stats.subjectCorrect?.['Matematik'] || 0) >= 1000,
    progress: (stats) => ({ current: Math.min(1000, stats.subjectCorrect?.['Matematik'] || 0), target: 1000 })
  },

  // FEN BİLİMLERİ
  {
    id: 'science_apprentice',
    title: 'Fen Çırağı',
    desc: 'Fen Bilimleri dersinde toplam 100 doğru soruya ulaş.',
    icon: '🔬',
    category: 'subject',
    xpReward: 10,
    check: (stats) => (stats.subjectCorrect?.['Fen Bilimleri'] || 0) >= 100,
    progress: (stats) => ({ current: Math.min(100, stats.subjectCorrect?.['Fen Bilimleri'] || 0), target: 100 })
  },
  {
    id: 'science_explorer',
    title: 'Fen Kaşifi',
    desc: 'Fen Bilimleri dersinde toplam 250 doğru soruya ulaş.',
    icon: '🔬',
    category: 'subject',
    xpReward: 25,
    check: (stats) => (stats.subjectCorrect?.['Fen Bilimleri'] || 0) >= 250,
    progress: (stats) => ({ current: Math.min(250, stats.subjectCorrect?.['Fen Bilimleri'] || 0), target: 250 })
  },
  {
    id: 'science_genius',
    title: 'Fen Bilgini',
    desc: 'Fen Bilimleri dersinde toplam 500 doğru soruya ulaş.',
    icon: '🧬',
    category: 'subject',
    xpReward: 50,
    check: (stats) => (stats.subjectCorrect?.['Fen Bilimleri'] || 0) >= 500,
    progress: (stats) => ({ current: Math.min(500, stats.subjectCorrect?.['Fen Bilimleri'] || 0), target: 500 })
  },
  {
    id: 'science_master',
    title: 'Fen Üstadı',
    desc: 'Fen Bilimleri dersinde toplam 1.000 doğru soruya ulaş.',
    icon: '🧪',
    category: 'subject',
    xpReward: 100,
    check: (stats) => (stats.subjectCorrect?.['Fen Bilimleri'] || 0) >= 1000,
    progress: (stats) => ({ current: Math.min(1000, stats.subjectCorrect?.['Fen Bilimleri'] || 0), target: 1000 })
  },

  // TÜRKÇE
  {
    id: 'turkish_apprentice',
    title: 'Kelime Çırağı',
    desc: 'Türkçe dersinde toplam 100 doğru soruya ulaş.',
    icon: '📖',
    category: 'subject',
    xpReward: 10,
    check: (stats) => (stats.subjectCorrect?.['Türkçe'] || 0) >= 100,
    progress: (stats) => ({ current: Math.min(100, stats.subjectCorrect?.['Türkçe'] || 0), target: 100 })
  },
  {
    id: 'turkish_explorer',
    title: 'Kelime Ustası',
    desc: 'Türkçe dersinde toplam 250 doğru soruya ulaş.',
    icon: '📖',
    category: 'subject',
    xpReward: 25,
    check: (stats) => (stats.subjectCorrect?.['Türkçe'] || 0) >= 250,
    progress: (stats) => ({ current: Math.min(250, stats.subjectCorrect?.['Türkçe'] || 0), target: 250 })
  },
  {
    id: 'turkish_master',
    title: 'Türkçe Üstadı',
    desc: 'Türkçe dersinde toplam 500 doğru soruya ulaş.',
    icon: '✒️',
    category: 'subject',
    xpReward: 50,
    check: (stats) => (stats.subjectCorrect?.['Türkçe'] || 0) >= 500,
    progress: (stats) => ({ current: Math.min(500, stats.subjectCorrect?.['Türkçe'] || 0), target: 500 })
  },
  {
    id: 'turkish_genius',
    title: 'Edebiyat Dehası',
    desc: 'Türkçe dersinde toplam 1.000 doğru soruya ulaş.',
    icon: '📜',
    category: 'subject',
    xpReward: 100,
    check: (stats) => (stats.subjectCorrect?.['Türkçe'] || 0) >= 1000,
    progress: (stats) => ({ current: Math.min(1000, stats.subjectCorrect?.['Türkçe'] || 0), target: 1000 })
  },

  // SOSYAL & İNKILAP TARİHİ
  {
    id: 'social_explorer',
    title: 'Tarih Kaşifi',
    desc: 'Sosyal Bilgiler / İnkılap Tarihi dersinde 100 doğruya ulaş.',
    icon: '🌍',
    category: 'subject',
    xpReward: 10,
    check: (stats) => (stats.subjectCorrect?.['Sosyal & İnkılap'] || 0) >= 100,
    progress: (stats) => ({ current: Math.min(100, stats.subjectCorrect?.['Sosyal & İnkılap'] || 0), target: 100 })
  },
  {
    id: 'social_genius',
    title: 'Sosyal Bilgini',
    desc: 'Sosyal Bilgiler / İnkılap Tarihi dersinde 250 doğruya ulaş.',
    icon: '🏛️',
    category: 'subject',
    xpReward: 25,
    check: (stats) => (stats.subjectCorrect?.['Sosyal & İnkılap'] || 0) >= 250,
    progress: (stats) => ({ current: Math.min(250, stats.subjectCorrect?.['Sosyal & İnkılap'] || 0), target: 250 })
  },
  {
    id: 'social_master',
    title: 'Tarih Üstadı',
    desc: 'Sosyal Bilgiler / İnkılap Tarihi dersinde 500 doğruya ulaş.',
    icon: '🗺️',
    category: 'subject',
    xpReward: 50,
    check: (stats) => (stats.subjectCorrect?.['Sosyal & İnkılap'] || 0) >= 500,
    progress: (stats) => ({ current: Math.min(500, stats.subjectCorrect?.['Sosyal & İnkılap'] || 0), target: 500 })
  },

  // İNGİLİZCE
  {
    id: 'english_apprentice',
    title: 'Dil Çırağı',
    desc: 'İngilizce dersinde 100 doğru soruya ulaş.',
    icon: '💬',
    category: 'subject',
    xpReward: 10,
    check: (stats) => (stats.subjectCorrect?.['İngilizce'] || 0) >= 100,
    progress: (stats) => ({ current: Math.min(100, stats.subjectCorrect?.['İngilizce'] || 0), target: 100 })
  },
  {
    id: 'english_pro',
    title: 'Global Dil',
    desc: 'İngilizce dersinde 250 doğru soruya ulaş.',
    icon: '🌐',
    category: 'subject',
    xpReward: 25,
    check: (stats) => (stats.subjectCorrect?.['İngilizce'] || 0) >= 250,
    progress: (stats) => ({ current: Math.min(250, stats.subjectCorrect?.['İngilizce'] || 0), target: 250 })
  },
  {
    id: 'english_master',
    title: 'Dil Dehası',
    desc: 'İngilizce dersinde 500 doğru soruya ulaş.',
    icon: '🗣️',
    category: 'subject',
    xpReward: 50,
    check: (stats) => (stats.subjectCorrect?.['İngilizce'] || 0) >= 500,
    progress: (stats) => ({ current: Math.min(500, stats.subjectCorrect?.['İngilizce'] || 0), target: 500 })
  },

  // DİN KÜLTÜRÜ
  {
    id: 'religion_apprentice',
    title: 'Ahlak Çırağı',
    desc: 'Din Kültürü dersinde 100 doğru soruya ulaş.',
    icon: '🕊️',
    category: 'subject',
    xpReward: 10,
    check: (stats) => (stats.subjectCorrect?.['Din Kültürü'] || 0) >= 100,
    progress: (stats) => ({ current: Math.min(100, stats.subjectCorrect?.['Din Kültürü'] || 0), target: 100 })
  },
  {
    id: 'religion_pro',
    title: 'Ahlak & Değerler',
    desc: 'Din Kültürü dersinde 250 doğru soruya ulaş.',
    icon: '✨',
    category: 'subject',
    xpReward: 25,
    check: (stats) => (stats.subjectCorrect?.['Din Kültürü'] || 0) >= 250,
    progress: (stats) => ({ current: Math.min(250, stats.subjectCorrect?.['Din Kültürü'] || 0), target: 250 })
  },
  {
    id: 'religion_master',
    title: 'Erdem Üstadı',
    desc: 'Din Kültürü dersinde 500 doğru soruya ulaş.',
    icon: '🌟',
    category: 'subject',
    xpReward: 50,
    check: (stats) => (stats.subjectCorrect?.['Din Kültürü'] || 0) >= 500,
    progress: (stats) => ({ current: Math.min(500, stats.subjectCorrect?.['Din Kültürü'] || 0), target: 500 })
  },

  // ÇOK YÖNLÜ ZİHİN
  {
    id: 'multi_subject_master',
    title: 'Çok Yönlü Zihin',
    desc: 'En az 4 farklı dersten en az 50\'şer doğru soru çöz.',
    icon: '🌈',
    category: 'subject',
    xpReward: 40,
    check: (stats) => Object.values(stats.subjectCorrect || {}).filter(c => c >= 50).length >= 4,
    progress: (stats) => ({ current: Math.min(4, Object.values(stats.subjectCorrect || {}).filter(c => c >= 50).length), target: 4 })
  },
  // ─── GÜNLÜK SERİ & DİSİPLİN (STREAKS) ───
  {
    id: 'streak_3',
    title: 'Alev Başlangıcı',
    desc: '3 gün aralıksız her gün ders çalış / test çöz.',
    icon: '🔥',
    category: 'streak',
    xpReward: 8,
    check: (stats) => stats.dailyStreak >= 3,
    progress: (stats) => ({ current: Math.min(3, stats.dailyStreak), target: 3 })
  },
  {
    id: 'streak_7',
    title: 'Durdurulamaz Seri',
    desc: '7 gün üst üste kesintisiz çalışmayı sürdür.',
    icon: '⚡',
    category: 'streak',
    xpReward: 18,
    check: (stats) => stats.dailyStreak >= 7,
    progress: (stats) => ({ current: Math.min(7, stats.dailyStreak), target: 7 })
  },
  {
    id: 'streak_14',
    title: 'Alışkanlık Zaferi',
    desc: '14 gün üst üste her gün test çöz / çalış.',
    icon: '🌋',
    category: 'streak',
    xpReward: 30,
    check: (stats) => stats.dailyStreak >= 14,
    progress: (stats) => ({ current: Math.min(14, stats.dailyStreak), target: 14 })
  },
  {
    id: 'streak_30',
    title: 'Demir Disiplin',
    desc: '30 gün kesintisiz seri yaparak alışkanlığı taçlandır.',
    icon: '🛡️',
    category: 'streak',
    xpReward: 50,
    check: (stats) => stats.dailyStreak >= 30,
    progress: (stats) => ({ current: Math.min(30, stats.dailyStreak), target: 30 })
  },

  // ─── ÇALIŞMA ODASI & ZAMAN ───
  {
    id: 'pomodoro_1',
    title: 'İlk Odak',
    desc: 'Çalışma odasında ilk Pomodoro oturumunu tamamla.',
    icon: '⏱️',
    category: 'study',
    xpReward: 4,
    check: (stats) => stats.pomodoroSessions >= 1,
    progress: (stats) => ({ current: Math.min(1, stats.pomodoroSessions), target: 1 })
  },
  {
    id: 'pomodoro_5',
    title: 'Odaklanma Ustası',
    desc: 'Çalışma odasında en az 5 Pomodoro oturumu tamamla.',
    icon: '🧘',
    category: 'study',
    xpReward: 12,
    check: (stats) => stats.pomodoroSessions >= 5,
    progress: (stats) => ({ current: Math.min(5, stats.pomodoroSessions), target: 5 })
  },
  {
    id: 'pomodoro_15',
    title: 'Derin Çalışma',
    desc: 'Çalışma odasında toplam 15 Pomodoro oturumuna ulaş.',
    icon: '🧠',
    category: 'study',
    xpReward: 25,
    check: (stats) => stats.pomodoroSessions >= 15,
    progress: (stats) => ({ current: Math.min(15, stats.pomodoroSessions), target: 15 })
  },
  {
    id: 'night_owl',
    title: 'Gece Kuşu',
    desc: 'Saat 22:00\'den sonra bir test çöz.',
    icon: '🦉',
    category: 'special',
    xpReward: 5,
    check: (stats) => stats.hasNightTest === true,
    progress: (stats) => ({ current: stats.hasNightTest ? 1 : 0, target: 1 })
  },
  {
    id: 'early_bird',
    title: 'Erken Kalkan',
    desc: 'Sabah 08:30\'dan önce bir test çöz.',
    icon: '🌅',
    category: 'special',
    xpReward: 5,
    check: (stats) => stats.hasEarlyTest === true,
    progress: (stats) => ({ current: stats.hasEarlyTest ? 1 : 0, target: 1 })
  },
  {
    id: 'weekend_warrior',
    title: 'Hafta Sonu Savaşçısı',
    desc: 'Hafta sonu (Cumartesi veya Pazar) test çöz.',
    icon: '🏕️',
    category: 'special',
    xpReward: 5,
    check: (stats) => stats.hasWeekendTest === true,
    progress: (stats) => ({ current: stats.hasWeekendTest ? 1 : 0, target: 1 })
  }
];

export function getLevelInfo(xp) {
  const currentXp = Math.max(0, Math.round(Number(xp) || 0));
  let activeTier = LEVEL_TIERS[0];
  let nextTier = LEVEL_TIERS[1];

  for (let i = 0; i < LEVEL_TIERS.length; i++) {
    if (currentXp >= LEVEL_TIERS[i].minXp) {
      activeTier = LEVEL_TIERS[i];
      nextTier = LEVEL_TIERS[i + 1] || null;
    }
  }

  const min = activeTier.minXp;
  const max = nextTier ? nextTier.minXp : (activeTier.minXp + 500);
  const span = max - min;
  const inTierXp = currentXp - min;
  const progressPercent = Math.min(100, Math.max(0, Math.round((inTierXp / span) * 100)));
  const remainingXp = Math.max(0, max - currentXp);

  return {
    ...activeTier,
    totalXp: currentXp,
    inTierXp,
    tierSpan: span,
    progressPercent,
    remainingXp,
    nextTierTitle: nextTier?.title || 'Zirve'
  };
}

export function computeStudentGamificationData({
  studentId,
  submissions = [],
  homeworks = [],
  books = [],
  bookTests = [],
  mockExams = [],
  studySessions = []
}) {
  const sId = String(studentId || '');
  if (!sId) {
    return {
      xp: 0,
      levelInfo: getLevelInfo(0),
      stats: { totalSolvedTests: 0, totalCorrect: 0, totalQuestionsSolved: 0, dailyStreak: 0, subjectCorrect: {} },
      unlockedBadges: [],
      lockedBadges: BADGE_DEFINITIONS.map(b => ({ ...b, progress: { current: 0, target: 1 } }))
    };
  }

  // 1. Resolve unified analytics using testResolver (includes Homeworks, Book Tests, Standalone Submissions & Mock Exams)
  let resolvedAnalytics = { generalTrialExams: [], otherHomeworkSubmissions: [] };
  try {
    resolvedAnalytics = computeStudentAnalyticsData({
      studentId: sId,
      submissions,
      homeworks,
      books,
      bookTests,
      studentMockExams: mockExams
    });
  } catch (err) {
    console.error('Error computing student analytics for gamification:', err);
  }

  const allItems = [
    ...(resolvedAnalytics.generalTrialExams || []),
    ...(resolvedAnalytics.otherHomeworkSubmissions || [])
  ];

  let totalCorrect = 0;
  let totalWrong = 0;
  let totalEmpty = 0;
  let totalSolvedTests = 0;
  let perfectTestsCount = 0;
  let highAccuracyTests = 0;
  let bookTestsSolvedCount = 0;
  let homeworksSolvedCount = 0;
  let hasNightTest = false;
  let hasEarlyTest = false;
  let hasWeekendTest = false;
  const subjectCorrect = {};
  const activeDates = new Set();

  allItems.forEach(item => {
    totalSolvedTests++;
    const correct = Number(item.correctCount ?? item.totalCorrect ?? 0);
    const wrong = Number(item.wrongCount ?? item.totalWrong ?? 0);
    const empty = Number(item.emptyCount ?? item.totalEmpty ?? 0);
    const totalQ = Number(item.totalQuestions || (correct + wrong + empty) || 1);

    totalCorrect += correct;
    totalWrong += wrong;
    totalEmpty += empty;

    // Track Tracked Book tests & Homework counts
    const isBookItem = Boolean(
      item.isBookTest ||
      item.isExamBook ||
      item.parentBookId ||
      item.bookTestId ||
      item.sourceType === 'trackedBook' ||
      item.sourceType === 'book' ||
      (item.title && (item.title.toLowerCase().includes('kitap') || item.title.includes('›')))
    );
    if (isBookItem) {
      bookTestsSolvedCount++;
    } else {
      homeworksSolvedCount++;
    }

    // Perfect test
    if (totalQ > 0 && correct === totalQ && wrong === 0) {
      perfectTestsCount++;
    }

    // High accuracy (>= 90%)
    if (totalQ > 0 && (correct / totalQ) >= 0.9) {
      highAccuracyTests++;
    }

    // Subject breakdown (from scores or item.subject)
    if (item.scores && typeof item.scores === 'object' && Object.keys(item.scores).length > 0) {
      Object.entries(item.scores).forEach(([subjKey, sc]) => {
        const c = Number(sc.d ?? sc.correct ?? 0);
        const canon = normalizeCanonicalSubject(subjKey);
        subjectCorrect[canon] = (subjectCorrect[canon] || 0) + c;
      });
    } else {
      const subj = item.subjectName || item.subject || 'Genel';
      const canon = normalizeCanonicalSubject(subj);
      subjectCorrect[canon] = (subjectCorrect[canon] || 0) + correct;
    }

    // Date & Time checks
    const rawDate = item.date || item.submittedAt || item.completedAt || item.createdAt;
    if (rawDate) {
      const dt = new Date(rawDate);
      if (!isNaN(dt.getTime())) {
        const ymd = dt.toISOString().split('T')[0];
        activeDates.add(ymd);

        const hours = dt.getHours();
        if (hours >= 22 || hours < 4) hasNightTest = true;
        if (hours >= 5 && hours <= 8) hasEarlyTest = true;

        const dayOfWeek = dt.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) hasWeekendTest = true;
      }
    }
  });

  // Calculate Pomodoro & Study Room activity
  const studentSessions = (studySessions || []).filter(ss => String(ss.studentId || ss.userId || '') === sId);
  const pomodoroSessions = studentSessions.length;
  let totalStudyMinutes = 0;
  studentSessions.forEach(ss => {
    totalStudyMinutes += Number(ss.durationMinutes || ss.duration || 25);
    const d = ss.date || ss.createdAt;
    if (d) {
      const dt = new Date(d);
      if (!isNaN(dt.getTime())) {
        activeDates.add(dt.toISOString().split('T')[0]);
        if (dt.getDay() === 0 || dt.getDay() === 6) hasWeekendTest = true;
      }
    }
  });

  // Calculate Daily Streak
  const sortedDates = Array.from(activeDates).sort().reverse();
  let dailyStreak = 0;
  if (sortedDates.length > 0) {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (sortedDates[0] === today || sortedDates[0] === yesterday) {
      dailyStreak = 1;
      let checkDate = new Date(sortedDates[0]);
      for (let i = 1; i < sortedDates.length; i++) {
        const prevExpected = new Date(checkDate.getTime() - 86400000).toISOString().split('T')[0];
        if (sortedDates[i] === prevExpected) {
          dailyStreak++;
          checkDate = new Date(sortedDates[i]);
        } else {
          break;
        }
      }
    }
  }

  const totalQuestionsSolved = totalCorrect + totalWrong + totalEmpty;
  const distinctSubjectsCount = Object.keys(subjectCorrect).filter(k => (subjectCorrect[k] || 0) > 0).length;

  // Build stats object for badge checker
  const stats = {
    totalSolvedTests,
    totalCorrect,
    totalQuestionsSolved,
    perfectTestsCount,
    highAccuracyTests,
    bookTestsSolvedCount,
    homeworksSolvedCount,
    distinctSubjectsCount,
    hasNightTest,
    hasEarlyTest,
    hasWeekendTest,
    pomodoroSessions,
    totalStudyMinutes,
    dailyStreak,
    subjectCorrect
  };

  // Evaluate Badges
  const unlockedBadges = [];
  const lockedBadges = [];

  BADGE_DEFINITIONS.forEach(b => {
    const isUnlocked = b.check(stats);
    const prog = b.progress(stats);
    if (isUnlocked) {
      unlockedBadges.push({ ...b, unlocked: true, progress: prog });
    } else {
      lockedBadges.push({ ...b, unlocked: false, progress: prog });
    }
  });

  // Scaled XP Calculation (1/10 scale)
  let totalXp = 0;
  totalXp += totalCorrect * 1;                         // 1 XP per correct answer
  totalXp += Math.round(totalSolvedTests * 2.5);       // 2.5 XP per completed test
  totalXp += perfectTestsCount * 5;                    // 5 XP per 100% test
  totalXp += Math.floor(totalStudyMinutes / 25) * 2;   // 2 XP per 25 min pomodoro
  totalXp += Math.round(dailyStreak * 1.5);            // 1.5 XP per streak day
  unlockedBadges.forEach(b => { totalXp += b.xpReward; });

  const levelInfo = getLevelInfo(totalXp);

  return {
    xp: totalXp,
    levelInfo,
    stats,
    unlockedBadges,
    lockedBadges
  };
}

export function computeLeaderboard({
  users = [],
  submissions = [],
  homeworks = [],
  books = [],
  bookTests = [],
  mockExams = [],
  studySessions = []
}) {
  const students = (users || []).filter(u => u.role === 'student');

  const ranking = students.map(st => {
    const data = computeStudentGamificationData({
      studentId: st.id,
      submissions,
      homeworks,
      books,
      bookTests,
      mockExams,
      studySessions
    });

    return {
      id: st.id,
      name: st.name || st.fullName || 'Öğrenci',
      avatar: st.avatar || null,
      xp: data.xp,
      levelInfo: data.levelInfo,
      streak: data.stats.dailyStreak,
      badgeCount: data.unlockedBadges.length,
      solvedCount: data.stats.totalQuestionsSolved,
      correctCount: data.stats.totalCorrect
    };
  });

  // Sort descending by XP
  return ranking.sort((a, b) => b.xp - a.xp);
}

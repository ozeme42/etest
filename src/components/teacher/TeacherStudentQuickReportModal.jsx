import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  X, User, Key, Check, Copy, Share2, MessageSquare,
  Calendar, Award, Target, BookOpen, Clock, Activity,
  ChevronRight, ExternalLink, CheckCircle2, AlertCircle, Edit2,
  Printer, TrendingUp, Sparkles, BookMarked, Layers, FileText,
  Star, ShieldCheck, Zap, Download, GraduationCap
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';
import { getAvatarBg, getSubjectTheme } from '../../config/subjectThemes';
import { getSubmissionScorePct } from '../../pages/TeacherDashboard';
import { computeStudentAnalyticsData } from '../../utils/testResolver';
import { timeAgo } from '../../utils/dateHelpers';

export default function TeacherStudentQuickReportModal({
  student,
  submissions = [],
  homeworks = [],
  books = [],
  bookTests = [],
  grades = [],
  teacherName = 'Sınıf Rehber Öğretmeni',
  schoolName = 'E-Test Akademi & Eğitim Kurumları',
  isCoached = false,
  onToggleCoaching,
  onEditStudent,
  onClose
}) {
  const { isDark } = useTheme();
  const [copiedPwd, setCopiedPwd] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [activeTab, setActiveTab] = useState('report'); // 'report' | 'charts' | 'topics' | 'tests' | 'notes'

  // Teacher Note state stored per student
  const [teacherNote, setTeacherNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteSavedAlert, setNoteSavedAlert] = useState(false);

  useEffect(() => {
    if (student?.id) {
      const saved = localStorage.getItem(`teacher_note_${student.id}`);
      setTeacherNote(saved || '');
    }
  }, [student?.id]);

  const handleSaveNote = () => {
    if (!student?.id) return;
    setIsSavingNote(true);
    localStorage.setItem(`teacher_note_${student.id}`, teacherNote);
    setTimeout(() => {
      setIsSavingNote(false);
      setNoteSavedAlert(true);
      setTimeout(() => setNoteSavedAlert(false), 2500);
    }, 300);
  };

  const handleAddPresetPhrase = (phrase) => {
    setTeacherNote(prev => prev ? `${prev} ${phrase}` : phrase);
  };

  // Helper to normalize subjects reliably
  const normalizeSubjectName = (rawName) => {
    if (!rawName) return 'Genel';
    const s = String(rawName).trim();
    const l = s.toLowerCase();
    if (l.includes('matematik') || l.includes('geometri')) return 'Matematik';
    if (l.includes('türkçe') || l.includes('paragraf') || l.includes('edebiyat') || l.includes('dil bilgisi')) return 'Türkçe';
    if (l.includes('fen') || l.includes('fizik') || l.includes('kimya') || l.includes('biyoloji')) return 'Fen Bilimleri';
    if (l.includes('sosyal') || l.includes('tarih') || l.includes('coğrafya') || l.includes('inkılap')) return 'Sosyal Bilgiler';
    if (l.includes('ingilizce') || l.includes('english')) return 'İngilizce';
    if (l.includes('din') || l.includes('ahlak')) return 'Din Kültürü';
    return s || 'Genel';
  };

  // Letter Grade Helper
  const getLetterGrade = (score) => {
    if (score >= 90) return { grade: 'AA', label: 'Pekiyi', color: '#10b981', status: 'Mükemmel' };
    if (score >= 80) return { grade: 'BA', label: 'Çok İyi', color: '#059669', status: 'Çok Başarılı' };
    if (score >= 70) return { grade: 'BB', label: 'İyi', color: '#3b82f6', status: 'Başarılı' };
    if (score >= 60) return { grade: 'CB', label: 'Orta-İyi', color: '#6366f1', status: 'Yeterli' };
    if (score >= 50) return { grade: 'CC', label: 'Orta', color: '#f59e0b', status: 'Geliştirilmeli' };
    if (score >= 40) return { grade: 'DC', label: 'Geçer', color: '#f97316', status: 'Destek Gerekir' };
    return { grade: 'FF', label: 'Yetersiz', color: '#ef4444', status: 'Kritik Seviye' };
  };

  // Student's Complete Resolved Submissions (including Tracked Books, Homeworks, and Optical Tests)
  const studentSubs = useMemo(() => {
    if (!student?.id) return [];
    const { generalTrialExams = [], otherHomeworkSubmissions = [] } = computeStudentAnalyticsData({
      studentId: student.id,
      targetStudent: student,
      submissions,
      homeworks,
      books,
      bookTests
    });

    return [...generalTrialExams, ...otherHomeworkSubmissions]
      .sort((a, b) => new Date(b.date || b.submittedAt || 0) - new Date(a.date || a.submittedAt || 0));
  }, [student, submissions, homeworks, books, bookTests]);

  // Performance Metrics & Subject Breakdown
  const stats = useMemo(() => {
    let totalQuestions = 0;
    let totalCorrect = 0;
    let totalWrong = 0;
    let totalBlank = 0;
    let totalNet = 0;
    let maxNet = 0;
    let bookTestsCount = 0;

    const subjectMap = {};
    const topicMap = {};
    const chartHistory = [];

    // Chronological for chart
    const chronoSubs = [...studentSubs].sort((a, b) => new Date(a.date || a.submittedAt || 0) - new Date(b.date || b.submittedAt || 0));

    chronoSubs.forEach((sub, idx) => {
      const correct = Number(sub.correctCount ?? sub.correct ?? 0);
      const wrong = Number(sub.wrongCount ?? sub.wrong ?? 0);
      const blank = Number(sub.emptyCount ?? sub.blankCount ?? 0);
      const qCount = Number(sub.totalQuestions || (correct + wrong + blank) || 10);
      const net = Number(sub.totalNet ?? (correct - (wrong * 0.25)) ?? 0);

      totalQuestions += qCount;
      totalCorrect += correct;
      totalWrong += wrong;
      totalBlank += blank;
      totalNet += net;
      if (net > maxNet) maxNet = net;

      if (sub.parentBookId || sub.isExamBook || sub.sourceType === 'bookTest') {
        bookTestsCount++;
      }

      const scorePct = qCount > 0 ? Math.round((correct / qCount) * 100) : 0;
      chartHistory.push({
        name: sub.title ? (sub.title.length > 14 ? sub.title.slice(0, 12) + '..' : sub.title) : `Test ${idx + 1}`,
        fullTitle: sub.title || `Test ${idx + 1}`,
        score: scorePct,
        net: Number(net.toFixed(1)),
        date: sub.date ? new Date(sub.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : `#${idx + 1}`
      });

      // Subject breakdown
      let subjName = normalizeSubjectName(sub.subject);
      if (subjName === 'Genel' && sub.parentBookId) {
        const parentBook = books.find(b => String(b.id) === String(sub.parentBookId));
        if (parentBook) {
          subjName = normalizeSubjectName(parentBook.subject || parentBook.title);
        }
      }

      if (!subjectMap[subjName]) {
        subjectMap[subjName] = { name: subjName, correct: 0, wrong: 0, blank: 0, total: 0, count: 0, netSum: 0 };
      }
      subjectMap[subjName].correct += correct;
      subjectMap[subjName].wrong += wrong;
      subjectMap[subjName].blank += blank;
      subjectMap[subjName].total += qCount;
      subjectMap[subjName].count += 1;
      subjectMap[subjName].netSum += net;

      // Topic Breakdown
      let topicName = sub.topic || sub.topicName;
      if (!topicName) {
        const rawTitle = sub.title || '';
        topicName = rawTitle
          .replace(/^[0-9]+[a-zA-ZçğıöşüÇĞİÖŞÜ\s\-\.\:]*—\s*/, '')
          .replace(/^Test\s*[0-9]+[\:\-\s]*/i, '')
          .trim();
        if (!topicName || topicName.length < 3) topicName = rawTitle || 'Genel Konu';
      }

      if (!topicMap[topicName]) {
        topicMap[topicName] = { name: topicName, subject: subjName, correct: 0, wrong: 0, blank: 0, total: 0, count: 0 };
      }
      topicMap[topicName].correct += correct;
      topicMap[topicName].wrong += wrong;
      topicMap[topicName].blank += blank;
      topicMap[topicName].total += qCount;
      topicMap[topicName].count += 1;
    });

    const avgScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    const avgNet = studentSubs.length > 0 ? Number((totalNet / studentSubs.length).toFixed(1)) : 0;
    const accuracyPct = totalQuestions > 0 ? Math.round((totalCorrect / (totalCorrect + totalWrong || 1)) * 100) : 0;

    const subjects = Object.values(subjectMap).map(s => {
      const avg = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
      const avgN = s.count > 0 ? Number((s.netSum / s.count).toFixed(1)) : 0;
      return {
        ...s,
        avg,
        avgNet: avgN,
        letter: getLetterGrade(avg),
        theme: getSubjectTheme(s.name)
      };
    }).sort((a, b) => b.total - a.total);

    const allTopics = Object.values(topicMap).map(t => ({
      ...t,
      avg: t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0
    })).sort((a, b) => b.total - a.total);

    // Top Strengths (Success >= 70%) & Weaknesses (Success < 55%)
    const strongTopics = [...allTopics].filter(t => t.total >= 4 && t.avg >= 70).sort((a, b) => b.avg - a.avg).slice(0, 3);
    const weakTopics = [...allTopics].filter(t => t.total >= 3 && t.avg < 60).sort((a, b) => a.avg - b.avg).slice(0, 3);

    return {
      totalQuestions,
      totalCorrect,
      totalWrong,
      totalBlank,
      totalNet: Number(totalNet.toFixed(1)),
      maxNet: Number(maxNet.toFixed(1)),
      avgScore,
      avgNet,
      accuracyPct,
      overallLetter: getLetterGrade(avgScore),
      testCount: studentSubs.length,
      bookTestsCount,
      subjects,
      allTopics,
      strongTopics,
      weakTopics,
      chartHistory: chartHistory.slice(-14)
    };
  }, [studentSubs, books]);

  // Student Homework metrics
  const homeworkMetrics = useMemo(() => {
    if (!student?.id) return { total: 0, completed: 0, pending: 0, completionRate: 100 };
    const assignedHw = (homeworks || []).filter(h => {
      const tIds = h.targetIds || [];
      return tIds.includes(student.id) || tIds.includes(String(student.id));
    });

    const completedCount = assignedHw.filter(h => {
      return (h.submissions || []).some(s => String(s.studentId) === String(student.id) || s.studentId === student.id);
    }).length;

    const completionRate = assignedHw.length > 0 ? Math.round((completedCount / assignedHw.length) * 100) : 100;

    return {
      total: assignedHw.length,
      completed: completedCount,
      pending: Math.max(0, assignedHw.length - completedCount),
      completionRate
    };
  }, [homeworks, student?.id]);

  // Class Info
  const gradeObj = grades.find(g => String(g.id) === String(student.gradeId) || String(g.id) === String(student.classId))
                || grades.find(g => g.name === student.gradeId || g.name === student.grade || g.name === student.className);
  const gradeLabel = gradeObj ? gradeObj.name : (student.grade || student.className || 'Sınıf Belirtilmemiş');

  const reportId = `ET-KARNE-${String(student.id).slice(-4).toUpperCase()}-${new Date().getFullYear()}`;
  const printDateStr = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

  // Copy password helper
  const handleCopyPassword = () => {
    navigator.clipboard.writeText(student.password || '123456');
    setCopiedPwd(true);
    setTimeout(() => setCopiedPwd(false), 2000);
  };

  // WhatsApp formatted message generator
  const handleCopyOrSendWhatsApp = (shouldOpenUrl = true) => {
    let subjectText = stats.subjects.map(s => 
      `  📘 *${s.name}*: %${s.avg} (${s.letter.grade}) — ${s.total} Soru (${s.correct}D / ${s.wrong}Y) • ${s.avgNet} Net`
    ).join('\n');
    if (!subjectText) subjectText = '  • Henüz branş bazlı test çözülmedi.';

    const message = 
`🎓 *RESMİ ÖĞRENCİ AKADEMİK PERFORMANS KARNESİ*
🏛️ *${schoolName}*
━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 *Öğrenci:* ${student.name}
🏫 *Sınıf / Şube:* ${gradeLabel}
👨‍🏫 *Danışman Öğretmen:* ${teacherName}
📅 *Karne Tarihi:* ${printDateStr}
📜 *Karne No:* ${reportId}

━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 *GENEL BAŞARI & DİSİPLİN GÖSTERGELERİ*
• Genel Başarı Notu: *%${stats.avgScore} (${stats.overallLetter.grade} - ${stats.overallLetter.label})*
• Toplam Çözülen Soru: *${stats.totalQuestions} Soru*
• Doğru / Yanlış / Boş: *${stats.totalCorrect}D / ${stats.totalWrong}Y / ${stats.totalBlank}B*
• Net Ortalaması: *${stats.avgNet} Net* (En Yüksek: ${stats.maxNet} Net)
• Soru Doğruluk Oranı: *%${stats.accuracyPct}*
• Tamamlanan Sınav / Test: *${stats.testCount} Adet* (${stats.bookTestsCount} Kitap Testi)
• Ödev Disiplini: *%${homeworkMetrics.completionRate}* (${homeworkMetrics.completed}/${homeworkMetrics.total} Ödev Tamamlandı)

━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 *DERS DERS DETAYLI KARNE DÖKÜMÜ*
${subjectText}

${stats.strongTopics.length > 0 ? `━━━━━━━━━━━━━━━━━━━━━━━━━━\n🌟 *EN GÜÇLÜ OLDUĞU KONULAR*\n` + stats.strongTopics.map(t => `  • ${t.name} (%${t.avg} Başarı - ${t.questions} Soru)`).join('\n') + '\n' : ''}${stats.weakTopics.length > 0 ? `━━━━━━━━━━━━━━━━━━━━━━━━━━\n⚠️ *ÖNCELİKLİ TEKRAR EDİLMESİ GEREKEN KONULAR*\n` + stats.weakTopics.map(t => `  • ${t.name} (%${t.avg} Başarı - ${t.questions} Soru)`).join('\n') + '\n' : ''}${teacherNote ? `━━━━━━━━━━━━━━━━━━━━━━━━━━\n📝 *ÖĞRETMEN DEĞERLENDİRME & GELİŞİM NOTU*\n"${teacherNote}"\n` : ''}━━━━━━━━━━━━━━━━━━━━━━━━━━
🔑 *Sistem Giriş Bilgileri:*
Şifre: *${student.password || '123456'}*
🌐 E-Test sistemi üzerinden çocuğunuzun gelişim karnesini ve soru çözümlerini anlık takip edebilirsiniz.`;

    navigator.clipboard.writeText(message);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2500);

    if (shouldOpenUrl) {
      const encoded = encodeURIComponent(message);
      window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    }
  };

  if (!student) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem',
      boxSizing: 'border-box'
    }}>
      <style>{
        `@media print {
          body * {
            visibility: hidden !important;
          }
          #official-student-report-card, #official-student-report-card * {
            visibility: visible !important;
          }
          #official-student-report-card {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            height: auto !important;
            background: white !important;
            color: black !important;
            border: none !important;
            box-shadow: none !important;
            padding: 1.5cm !important;
            box-sizing: border-box !important;
            font-family: 'Segoe UI', system-ui, sans-serif !important;
          }
          .no-print {
            display: none !important;
          }
          .print-break-inside {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }`
      }</style>

      <div
        id="official-student-report-card"
        style={{
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-border)',
          borderRadius: '1.5rem',
          width: '100%',
          maxWidth: 900,
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden'
        }}
      >
        
        {/* ── 1. MODAL TOP BAR & ACTIONS (NO PRINT) ── */}
        <div className="no-print" style={{
          padding: '1.1rem 1.5rem',
          borderBottom: '1.5px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--color-surface)',
          flexWrap: 'wrap',
          gap: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              color: '#fff', fontWeight: 900, fontSize: '1.2rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)'
            }}>
              {(student.name || 'Ö').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.15rem', color: 'var(--color-text)' }}>
                  {student.name}
                </h3>
                <span style={{ fontSize: '0.72rem', fontWeight: 900, padding: '2px 8px', borderRadius: 99, background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                  {gradeLabel}
                </span>
                <span style={{
                  fontSize: '0.72rem', fontWeight: 900, padding: '2px 8px', borderRadius: 99,
                  background: `${stats.overallLetter.color}22`, color: stats.overallLetter.color,
                  border: `1px solid ${stats.overallLetter.color}44`
                }}>
                  {stats.overallLetter.grade} ({stats.overallLetter.label})
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginTop: 2 }}>
                {student.email} · Resmi Karne Seri No: <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>{reportId}</span>
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Print / PDF Button */}
            <button
              onClick={() => window.print()}
              style={{
                padding: '0.45rem 0.85rem', borderRadius: '0.65rem',
                background: 'var(--color-surface-hover)', border: '1.5px solid var(--color-border-input)',
                color: 'var(--color-text)', fontWeight: 800, fontSize: '0.76rem',
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5
              }}
              title="Resmi A4 Karne Çıktısı Al / PDF İndir"
            >
              <Printer size={14} /> Yazdır / PDF
            </button>

            {/* WhatsApp Share Button */}
            <button
              onClick={() => handleCopyOrSendWhatsApp(true)}
              style={{
                padding: '0.45rem 0.95rem', borderRadius: '0.65rem',
                background: 'linear-gradient(135deg, #25D366, #128C7E)',
                border: 'none', color: '#ffffff',
                fontWeight: 900, fontSize: '0.76rem', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 5,
                boxShadow: '0 4px 14px rgba(37, 211, 102, 0.3)'
              }}
              title="Karnesi Veliye WhatsApp ile Gönder"
            >
              <MessageSquare size={14} /> Veliye Gönder
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'var(--color-surface-hover)', border: 'none',
                color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── 2. MODAL SUB-TABS (NO PRINT) ── */}
        <div className="no-print" style={{
          padding: '0.5rem 1.5rem',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-surface-hover)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          overflowX: 'auto',
          scrollbarWidth: 'none'
        }}>
          {[
            { id: 'report', label: '📜 Resmi Karne', icon: Award },
            { id: 'charts', label: '📈 Gelişim Grafikleri', icon: TrendingUp },
            { id: 'topics', label: `🎯 Konu Analizi (${stats.allTopics.length})`, icon: Layers },
            { id: 'tests', label: `🧪 Sınav Geçmişi (${stats.testCount})`, icon: Activity },
            { id: 'notes', label: '📝 Öğretmen & Rehber Notu', icon: Edit2 }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: '0.35rem 0.8rem',
                borderRadius: '0.6rem',
                border: 'none',
                background: activeTab === t.id ? '#6366f1' : 'transparent',
                color: activeTab === t.id ? '#ffffff' : 'var(--color-text-muted)',
                fontWeight: 800,
                fontSize: '0.74rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <t.icon size={13} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* ── 3. MODAL SCROLLABLE BODY (KARNE RAPORU) ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>

          {/* ════════════ OFFICIAL REPORT CARD HEADER (PRINT & VIEW) ════════════ */}
          <div className="print-break-inside" style={{
            background: 'var(--color-surface-hover)',
            border: '1.5px solid var(--color-border)',
            borderRadius: '1.25rem',
            padding: '1.1rem 1.35rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <GraduationCap size={18} color="#6366f1" />
                <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {schoolName}
                </span>
              </div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-text)' }}>
                ÖĞRENCİ AKADEMİK GELİŞİM VE PERFORMANS KARNESİ
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                2025 - 2026 Eğitim Öğretim Yılı · Dönemlik Değerlendirme Raporu
              </span>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'block' }}>KARNE DÜZENLEME TARİHİ</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--color-text)' }}>{printDateStr}</span>
              <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', display: 'block', marginTop: 2 }}>Danışman: <strong>{teacherName}</strong></span>
            </div>
          </div>

          {/* ════════════ TAB 1: RESMİ KARNE (REPORT OVERVIEW) ════════════ */}
          {(activeTab === 'report' || activeTab === 'all') && (
            <>
              {/* ── 6 CORE KPI STAT TILES ── */}
              <div className="print-break-inside" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '0.65rem'
              }}>
                {/* 1. Başarı Puanı */}
                <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: '1rem', padding: '0.75rem 0.9rem' }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>Genel Başarı</span>
                  <span style={{ fontSize: '1.35rem', fontWeight: 900, color: stats.overallLetter.color }}>%{stats.avgScore}</span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'block' }}>{stats.overallLetter.grade} ({stats.overallLetter.label})</span>
                </div>

                {/* 2. Toplam Soru */}
                <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: '1rem', padding: '0.75rem 0.9rem' }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>Çözülen Soru</span>
                  <span style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--color-text)' }}>{stats.totalQuestions}</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', display: 'block' }}>{stats.testCount} Sınav ({stats.bookTestsCount} Kitap)</span>
                </div>

                {/* 3. D / Y / B */}
                <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: '1rem', padding: '0.75rem 0.9rem' }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>Doğru / Yanlış / Boş</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
                    <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#10b981' }}>{stats.totalCorrect}D</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ef4444' }}>{stats.totalWrong}Y</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{stats.totalBlank}B</span>
                  </div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', display: 'block' }}>Toplam {stats.totalQuestions} Soru</span>
                </div>

                {/* 4. Ortalama Net */}
                <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: '1rem', padding: '0.75rem 0.9rem' }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>Ortalama Net</span>
                  <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#6366f1' }}>{stats.avgNet}</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', display: 'block' }}>En Yüksek: {stats.maxNet} Net</span>
                </div>

                {/* 5. Doğruluk Yüzdesi */}
                <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: '1rem', padding: '0.75rem 0.9rem' }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>Doğruluk Oranı</span>
                  <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#059669' }}>%{stats.accuracyPct}</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', display: 'block' }}>Net İsabet Düzeyi</span>
                </div>

                {/* 6. Ödev Tamamlama */}
                <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: '1rem', padding: '0.75rem 0.9rem' }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>Ödev Disiplini</span>
                  <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#f59e0b' }}>%{homeworkMetrics.completionRate}</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', display: 'block' }}>{homeworkMetrics.completed}/{homeworkMetrics.total} Ödev Bitti</span>
                </div>
              </div>

              {/* ── BRANŞ BAZINDA DETAYLI KARNE TABLOSU ── */}
              <div className="print-break-inside" style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: '1.25rem', padding: '1.15rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                  <h4 style={{ margin: 0, fontWeight: 900, fontSize: '0.95rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <BookOpen size={17} color="#6366f1" /> Ders &amp; Branş Bazında Karne Değerlendirmesi
                  </h4>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                    {stats.subjects.length} Branş Değerlendirildi
                  </span>
                </div>

                {stats.subjects.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                    Henüz branş bazlı sınav/test verisi bulunmuyor.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                          <th style={{ padding: '0.6rem 0.5rem' }}>Branş / Ders</th>
                          <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>Soru</th>
                          <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>Doğru</th>
                          <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>Yanlış</th>
                          <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>Boş</th>
                          <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>Ort. Net</th>
                          <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>Başarı %</th>
                          <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>Harf Notu</th>
                          <th style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>Değerlendirme</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.subjects.map((subj, sIdx) => {
                          const sc = subj.theme;
                          const lt = subj.letter;
                          return (
                            <tr key={subj.name} style={{ borderBottom: '1px solid var(--color-border)', fontWeight: 600 }}>
                              <td style={{ padding: '0.75rem 0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: sc.accent || '#6366f1' }} />
                                  <span style={{ fontWeight: 900, color: sc.accent || 'var(--color-text)' }}>{subj.name}</span>
                                </div>
                                <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', paddingLeft: 14 }}>{subj.count} Sınav / Test</span>
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 800 }}>{subj.total}</td>
                              <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: '#10b981', fontWeight: 900 }}>{subj.correct}</td>
                              <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: '#ef4444', fontWeight: 800 }}>{subj.wrong}</td>
                              <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>{subj.blank}</td>
                              <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 900, color: '#6366f1' }}>{subj.avgNet}</td>
                              <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                                <span style={{ padding: '2px 8px', borderRadius: 99, background: `${lt.color}15`, color: lt.color, fontWeight: 900, border: `1px solid ${lt.color}33` }}>
                                  %{subj.avg}
                                </span>
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 900, color: lt.color }}>
                                {lt.grade}
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 800, color: lt.color }}>
                                {lt.status}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ── GÜÇLÜ & GELİŞTİRİLMESİ GEREKEN KONULAR DİAGNOSTİĞİ ── */}
              <div className="print-break-inside" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '0.85rem'
              }}>
                {/* En Güçlü Konular */}
                <div style={{ background: 'var(--color-surface)', border: '1.5px solid rgba(16, 185, 129, 0.3)', borderRadius: '1.15rem', padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.65rem' }}>
                    <Star size={16} color="#10b981" />
                    <h5 style={{ margin: 0, fontWeight: 900, fontSize: '0.88rem', color: '#10b981' }}>
                      🌟 En Güçlü Olduğu Konular
                    </h5>
                  </div>
                  {stats.strongTopics.length === 0 ? (
                    <span style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)' }}>Yeterli konu çözümü bekleniyor.</span>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                      {stats.strongTopics.map((top, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 0.65rem', borderRadius: '0.6rem', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text)' }}>{top.name}</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#10b981' }}>%{top.avg} ({top.total} Soru)</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Geliştirilmesi Gereken Konular */}
                <div style={{ background: 'var(--color-surface)', border: '1.5px solid rgba(245, 158, 11, 0.3)', borderRadius: '1.15rem', padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.65rem' }}>
                    <AlertCircle size={16} color="#f59e0b" />
                    <h5 style={{ margin: 0, fontWeight: 900, fontSize: '0.88rem', color: '#f59e0b' }}>
                      ⚠️ Öncelikli Tekrar Edilmesi Gerekenler
                    </h5>
                  </div>
                  {stats.weakTopics.length === 0 ? (
                    <span style={{ fontSize: '0.76rem', color: '#10b981', fontWeight: 700 }}>Kritik zayıf konu bulunmuyor, harika!</span>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                      {stats.weakTopics.map((top, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 0.65rem', borderRadius: '0.6rem', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text)' }}>{top.name}</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#f59e0b' }}>%{top.avg} ({top.total} Soru)</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── ÖĞRETMEN DEĞERLENDİRME & GELİŞİM NOTU (PRINT & VIEW) ── */}
              <div className="print-break-inside" style={{
                background: 'rgba(99, 102, 241, 0.06)',
                border: '1.5px solid rgba(99, 102, 241, 0.25)',
                borderRadius: '1.25rem',
                padding: '1.1rem 1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <h5 style={{ margin: 0, fontWeight: 900, fontSize: '0.9rem', color: '#6366f1', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Edit2 size={15} /> Öğretmen &amp; Rehberlik Değerlendirme Raporu
                  </h5>
                  <button className="no-print" onClick={() => setActiveTab('notes')} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer' }}>
                    Notu Düzenle
                  </button>
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text)', fontStyle: 'italic', lineHeight: 1.5 }}>
                  "{teacherNote || 'Öğrencinin genel ders içi katılımı ve soru çözme disiplini takdir edilmektedir. Belirlenen odak konularda soru sayısının artırılması net gelişimine büyük katkı sağlayacaktır.'}"
                </p>
              </div>

              {/* ── RESMİ İMZA & ONAY KUTULARI (PRINT READY) ── */}
              <div className="print-break-inside" style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '2rem',
                paddingTop: '1rem',
                borderTop: '1.5px dashed var(--color-border)'
              }}>
                <div style={{ textAlign: 'center', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--color-border)', background: 'var(--color-surface-hover)' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'block' }}>SINIF REHBER ÖĞRETMENİ</span>
                  <p style={{ margin: '0.4rem 0 2rem', fontWeight: 900, fontSize: '0.88rem', color: 'var(--color-text)' }}>{teacherName}</p>
                  <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>İmza / Mühür</span>
                </div>

                <div style={{ textAlign: 'center', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--color-border)', background: 'var(--color-surface-hover)' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'block' }}>OKUL MÜDÜRÜ / KURUM YÖNETİMİ</span>
                  <p style={{ margin: '0.4rem 0 2rem', fontWeight: 900, fontSize: '0.88rem', color: 'var(--color-text)' }}>{schoolName}</p>
                  <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>Onay / Mühür</span>
                </div>
              </div>
            </>
          )}

          {/* ════════════ TAB 2: GELİŞİM GRAFİKLERİ ════════════ */}
          {activeTab === 'charts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              {/* Grafik 1: Tarihsel Puan Eğrisi */}
              <div style={{ background: 'var(--color-surface-hover)', border: '1.5px solid var(--color-border)', borderRadius: '1.25rem', padding: '1.1rem' }}>
                <h5 style={{ margin: '0 0 0.85rem', fontWeight: 900, fontSize: '0.92rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TrendingUp size={16} color="#6366f1" /> Sınavlar Boyunca Başarı Yüzdesi &amp; Net Eğrisi
                </h5>
                <div style={{ height: 200, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.chartHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="scoreAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} vertical={false} />
                      <XAxis dataKey="date" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} />
                      <YAxis stroke="var(--color-text-muted)" fontSize={11} domain={[0, 100]} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: isDark ? '#1e293b' : '#ffffff', border: '1.5px solid var(--color-border)', borderRadius: '0.75rem', fontSize: '0.78rem', fontWeight: 800 }}
                        formatter={(value, name) => [`%${value} Başarı`, 'Puan']}
                        labelFormatter={(label, p) => p?.[0]?.payload?.fullTitle || label}
                      />
                      <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#scoreAreaGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Grafik 2: Branş Dağılım Sütun Grafiği */}
              <div style={{ background: 'var(--color-surface-hover)', border: '1.5px solid var(--color-border)', borderRadius: '1.25rem', padding: '1.1rem' }}>
                <h5 style={{ margin: '0 0 0.85rem', fontWeight: 900, fontSize: '0.92rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BookOpen size={16} color="#10b981" /> Branş Bazında Başarı Dağılımı (%)
                </h5>
                <div style={{ height: 180, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.subjects} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} vertical={false} />
                      <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} />
                      <YAxis stroke="var(--color-text-muted)" fontSize={11} domain={[0, 100]} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: isDark ? '#1e293b' : '#ffffff', border: '1.5px solid var(--color-border)', borderRadius: '0.75rem', fontSize: '0.78rem', fontWeight: 800 }}
                        formatter={(value) => [`%${value} Başarı`, 'Ortalama']}
                      />
                      <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
                        {stats.subjects.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.theme.accent || '#6366f1'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* ════════════ TAB 3: KONU ANALİZİ ════════════ */}
          {activeTab === 'topics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h5 style={{ margin: 0, fontWeight: 900, fontSize: '0.95rem', color: 'var(--color-text)' }}>
                  🎯 Konu Konu Çözülen Soru ve Başarı Dökümü ({stats.allTopics.length} Konu)
                </h5>
              </div>

              {stats.allTopics.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--color-text-muted)' }}>
                  Henüz çözülen konu verisi bulunmuyor.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.65rem' }}>
                  {stats.allTopics.map((top, tIdx) => {
                    const tc = top.avg >= 70 ? '#10b981' : top.avg >= 50 ? '#f59e0b' : '#ef4444';
                    return (
                      <div
                        key={top.name || tIdx}
                        style={{
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '0.85rem',
                          padding: '0.75rem 0.95rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.4rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--color-text)', lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {top.name}
                          </span>
                          <span style={{ fontSize: '0.78rem', fontWeight: 900, color: tc, padding: '1px 6px', borderRadius: 99, background: `${tc}22`, flexShrink: 0 }}>
                            %{top.avg}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                          <span>{top.total} Soru</span>
                          <span style={{ color: '#10b981', fontWeight: 700 }}>{top.correct}D</span>
                          <span style={{ color: '#ef4444', fontWeight: 700 }}>{top.wrong}Y</span>
                          <span>{top.blank}B</span>
                        </div>

                        <div style={{ height: 4, background: 'var(--color-border)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${top.avg}%`, background: tc, borderRadius: 4 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ════════════ TAB 4: SINAV GEÇMİŞİ ════════════ */}
          {activeTab === 'tests' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h5 style={{ margin: 0, fontWeight: 900, fontSize: '0.92rem', color: 'var(--color-text)' }}>
                  🧪 Çözülen Tüm Sınavlar ve Test Sonuçları ({studentSubs.length})
                </h5>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Tarihe göre sıralı</span>
              </div>

              {studentSubs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 0', color: 'var(--color-text-muted)' }}>
                  Henüz çözülmüş sınav kaydı bulunamadı.
                </div>
              ) : (
                studentSubs.map((sub, i) => {
                  const correct = Number(sub.correctCount ?? sub.correct ?? 0);
                  const wrong = Number(sub.wrongCount ?? sub.wrong ?? 0);
                  const blank = Number(sub.emptyCount ?? sub.blankCount ?? 0);
                  const qCount = Number(sub.totalQuestions || (correct + wrong + blank) || 10);
                  const scorePct = qCount > 0 ? Math.round((correct / qCount) * 100) : 0;
                  const net = Number(sub.totalNet ?? (correct - (wrong * 0.25)) ?? 0);
                  const good = scorePct >= 70;

                  return (
                    <div
                      key={sub.id || i}
                      style={{
                        padding: '0.75rem 1rem', borderRadius: '0.85rem',
                        background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap'
                      }}
                    >
                      <div style={{ minWidth: 200, flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: 900, fontSize: '0.85rem', color: 'var(--color-text)' }}>{sub.title || 'Sınav'}</p>
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                          {sub.subject || 'Genel'} · {sub.date ? new Date(sub.date).toLocaleDateString('tr-TR') : 'Tarih yok'}
                          {sub.parentBookId && <span style={{ marginLeft: 6, color: '#6366f1', fontWeight: 800 }}>📖 Kitap Testi</span>}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.78rem' }}>
                        <span style={{ color: '#10b981', fontWeight: 800 }}>{correct}D</span>
                        <span style={{ color: '#ef4444', fontWeight: 800 }}>{wrong}Y</span>
                        <span style={{ color: 'var(--color-text-muted)' }}>{blank}B</span>
                        <span style={{ color: '#6366f1', fontWeight: 900 }}>{net.toFixed(1)} Net</span>
                      </div>

                      <span style={{
                        padding: '2px 8px', borderRadius: 99,
                        background: good ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: good ? '#10b981' : '#ef4444',
                        fontWeight: 900, fontSize: '0.8rem'
                      }}>
                        %{scorePct}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ════════════ TAB 5: ÖĞRETMEN NOTLARI & HAZIR ŞABLONLAR ════════════ */}
          {activeTab === 'notes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h5 style={{ margin: 0, fontWeight: 900, fontSize: '0.95rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Edit2 size={16} color="#6366f1" /> Öğretmen &amp; Rehberlik Değerlendirme Notu Editörü
                </h5>
                {noteSavedAlert && (
                  <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Check size={15} /> Not başarıyla kaydedildi!
                  </span>
                )}
              </div>

              {/* Hızlı Hazır Şablon Butonları */}
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>
                  💡 Hızlı Öneri ve Değerlendirme Şablonları (Tıklayarak Ekleyin):
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                  {[
                    '🎯 Matematik ve fen branşlarında üstün gayret gösteriyor.',
                    '⚡ Paragraf ve problem çözme soru sayısını artırmalıyız.',
                    '⏰ Deneme sınavlarında zaman yönetimini başarıyla koruyor.',
                    '📚 Kitap takibi ve ödevlerini düzenli tamamlıyor, tebrikler.',
                    '🔍 Yanlış ve boş soruların analizini dikkatle yapmasını öneririm.'
                  ].map((phrase, pi) => (
                    <button
                      key={pi}
                      type="button"
                      onClick={() => handleAddPresetPhrase(phrase)}
                      style={{
                        padding: '0.35rem 0.65rem', borderRadius: '0.55rem',
                        background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)',
                        color: 'var(--color-text)', fontSize: '0.72rem', fontWeight: 700,
                        cursor: 'pointer', textAlign: 'left'
                      }}
                    >
                      + {phrase}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                rows={6}
                value={teacherNote}
                onChange={(e) => setTeacherNote(e.target.value)}
                placeholder="Örn: Ahmet bu dönem Matematik ve Fen derslerinde çok gayretli. Paragraf ve problem çözme soru adetlerini artırması durumunda başarısı daha da yükselecektir..."
                style={{
                  width: '100%', padding: '0.85rem', borderRadius: '0.85rem',
                  border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)',
                  color: 'var(--color-text)', fontSize: '0.85rem', outline: 'none', resize: 'vertical',
                  boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.45
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  onClick={handleSaveNote}
                  disabled={isSavingNote}
                  style={{
                    padding: '0.6rem 1.35rem', borderRadius: '0.75rem',
                    background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                    border: 'none', color: '#ffffff', fontWeight: 900, fontSize: '0.82rem',
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)'
                  }}
                >
                  <Check size={16} /> {isSavingNote ? 'Kaydediliyor...' : 'Notu Kaydet'}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* ── 4. MODAL BOTTOM BAR (NO PRINT) ── */}
        <div className="no-print" style={{
          padding: '0.85rem 1.5rem',
          borderTop: '1.5px solid var(--color-border)',
          background: 'var(--color-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          {/* Left: Password Copy Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>Giriş Şifresi:</span>
            <button
              onClick={handleCopyPassword}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 8px', borderRadius: 6,
                background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)',
                color: '#fbbf24', fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 900, cursor: 'pointer'
              }}
              title="Şifreyi Kopyala"
            >
              <Key size={12} />
              <span>{student.password || '123456'}</span>
              {copiedPwd ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
            </button>
          </div>

          {/* Right: Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => handleCopyOrSendWhatsApp(false)}
              style={{
                padding: '0.5rem 0.95rem', borderRadius: '0.75rem',
                background: 'var(--color-surface-hover)', border: '1.5px solid var(--color-border-input)',
                color: 'var(--color-text)', fontWeight: 800, fontSize: '0.78rem',
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5
              }}
            >
              <Copy size={14} /> {copiedMsg ? 'Metin Kopyalandı!' : 'Karne Metnini Kopyala'}
            </button>

            <Link to={`/coaching/${student.id}`} style={{ textDecoration: 'none' }}>
              <button
                style={{
                  padding: '0.5rem 0.95rem', borderRadius: '0.75rem',
                  background: 'rgba(139, 92, 246, 0.15)', border: '1.5px solid rgba(139, 92, 246, 0.3)',
                  color: '#c084fc', fontWeight: 900, fontSize: '0.78rem',
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5
                }}
              >
                <Target size={14} /> Koçluk &amp; Program
              </button>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

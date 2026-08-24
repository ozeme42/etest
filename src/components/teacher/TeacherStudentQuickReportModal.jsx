import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  X, User, Key, Check, Copy, Share2, MessageSquare,
  Calendar, Award, Target, BookOpen, Clock, Activity,
  ChevronRight, ExternalLink, CheckCircle2, AlertCircle, Edit2,
  Printer, TrendingUp, Sparkles, BookMarked, Layers, FileText
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
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
  teacherName = 'Öğretmeniniz',
  isCoached = false,
  onToggleCoaching,
  onEditStudent,
  onClose
}) {
  const { isDark } = useTheme();
  const [copiedPwd, setCopiedPwd] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [activeTab, setActiveTab] = useState('report'); // 'report' | 'tests' | 'notes'

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

  if (!student) return null;

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

  // Student's Complete Resolved Submissions (including Tracked Books, Homeworks, and Optical Tests)
  const studentSubs = useMemo(() => {
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

      if (sub.parentBookId || sub.isExamBook || sub.sourceType === 'bookTest') {
        bookTestsCount++;
      }

      const scorePct = qCount > 0 ? Math.round((correct / qCount) * 100) : 0;
      chartHistory.push({
        name: sub.title ? (sub.title.length > 12 ? sub.title.slice(0, 10) + '..' : sub.title) : `Test ${idx + 1}`,
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
      let topicName = sub.topic || sub.topicName || sub.title || 'Genel Konu';
      if (!topicMap[topicName]) {
        topicMap[topicName] = { name: topicName, subject: subjName, correct: 0, wrong: 0, total: 0, count: 0 };
      }
      topicMap[topicName].correct += correct;
      topicMap[topicName].wrong += wrong;
      topicMap[topicName].total += qCount;
      topicMap[topicName].count += 1;
    });

    const avgScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    const avgNet = studentSubs.length > 0 ? Number((totalNet / studentSubs.length).toFixed(1)) : 0;

    const subjects = Object.values(subjectMap).map(s => ({
      ...s,
      avg: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
      avgNet: s.count > 0 ? Number((s.netSum / s.count).toFixed(1)) : 0,
      theme: getSubjectTheme(s.name)
    })).sort((a, b) => b.total - a.total);

    const topics = Object.values(topicMap).map(t => ({
      ...t,
      avg: t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0
    })).sort((a, b) => b.total - a.total);

    return {
      totalQuestions,
      totalCorrect,
      totalWrong,
      totalBlank,
      totalNet: Number(totalNet.toFixed(1)),
      avgScore,
      avgNet,
      testCount: studentSubs.length,
      bookTestsCount,
      subjects,
      topics,
      chartHistory: chartHistory.slice(-12)
    };
  }, [studentSubs, books]);

  // Student Homework metrics
  const homeworkMetrics = useMemo(() => {
    const assignedHw = (homeworks || []).filter(h => {
      const tIds = h.targetIds || [];
      return tIds.includes(student.id) || tIds.includes(String(student.id));
    });

    const completedCount = assignedHw.filter(h => {
      return (h.submissions || []).some(s => String(s.studentId) === String(student.id) || s.studentId === student.id);
    }).length;

    return {
      total: assignedHw.length,
      completed: completedCount,
      pending: Math.max(0, assignedHw.length - completedCount)
    };
  }, [homeworks, student.id]);

  // Class Info
  const gradeObj = grades.find(g => String(g.id) === String(student.gradeId) || String(g.id) === String(student.classId))
                || grades.find(g => g.name === student.gradeId || g.name === student.grade || g.name === student.className);
  const gradeLabel = gradeObj ? gradeObj.name : (student.grade || student.className || 'Sınıf Belirtilmemiş');

  // Copy password helper
  const handleCopyPassword = () => {
    navigator.clipboard.writeText(student.password || '123456');
    setCopiedPwd(true);
    setTimeout(() => setCopiedPwd(false), 2000);
  };

  // WhatsApp formatted message generator
  const handleCopyOrSendWhatsApp = (shouldOpenUrl = true) => {
    const dateStr = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    
    let subjectText = stats.subjects.map(s => `  • ${s.name}: %${s.avg} Başarı (${s.total} Soru - ${s.correct}D / ${s.wrong}Y)`).join('\n');
    if (!subjectText) subjectText = '  • Henüz branş bazlı test çözülmedi.';

    const message = 
`📊 *ÖĞRENCİ PERFORMANS VE GELİŞİM KARNESİ*
📅 *Tarih:* ${dateStr}
🎓 *Öğrenci:* ${student.name} (${gradeLabel})
👨‍🏫 *Öğretmen:* ${teacherName}

━━━━━━━━━━━━━━━━━━━━
📈 *GENEL AKADEMİK ÖZET*
• Toplam Çözülen Soru: *${stats.totalQuestions} Soru*
• Tamamlanan Sınav/Test: *${stats.testCount} Adet* (${stats.bookTestsCount} Kitap Testi)
• Genel Başarı Puanı: *%${stats.avgScore}*
• Net Ortalaması: *${stats.avgNet} Net*
• Doğru / Yanlış / Boş: *${stats.totalCorrect}D / ${stats.totalWrong}Y / ${stats.totalBlank}B*
• Ödev Tamamlama: *${homeworkMetrics.completed}/${homeworkMetrics.total} Ödev*

━━━━━━━━━━━━━━━━━━━━
📚 *DERS BAZINDA PERFORMANS*
${subjectText}

${teacherNote ? `━━━━━━━━━━━━━━━━━━━━\n📝 *ÖĞRETMEN DEĞERLENDİRME NOTU*\n"${teacherNote}"\n` : ''}━━━━━━━━━━━━━━━━━━━━
✨ *Sistem Giriş Bilgileri:*
🔑 Giriş Şifresi: *${student.password || '123456'}*
🌐 E-Test Platformu üzerinden detaylı karneye ulaşabilirsiniz.`;

    navigator.clipboard.writeText(message);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2500);

    if (shouldOpenUrl) {
      const encoded = encodeURIComponent(message);
      window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem',
      boxSizing: 'border-box'
    }}>
      <div style={{
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: '1.5rem',
        width: '100%',
        maxWidth: 820,
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.4)',
        overflow: 'hidden'
      }}>
        
        {/* ── 1. MODAL TOP HEADER (SCREEN ONLY) ── */}
        <div style={{
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
              background: getAvatarBg(0),
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
                {isCoached && (
                  <span style={{ fontSize: '0.72rem', fontWeight: 900, padding: '2px 8px', borderRadius: 99, background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                    🎯 Koçlukta
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginTop: 2 }}>
                {student.email} · Öğrenci Performans Karnesi &amp; Gelişim Dosyası
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* Print Button */}
            <button
              onClick={() => window.print()}
              style={{
                padding: '0.45rem 0.8rem', borderRadius: '0.65rem',
                background: 'var(--color-surface-hover)', border: '1.5px solid var(--color-border-input)',
                color: 'var(--color-text)', fontWeight: 800, fontSize: '0.76rem',
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4
              }}
              title="Karnesi Yazdır / PDF İndir"
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
              title="WhatsApp İle Veliye Gönder"
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

        {/* ── 2. MODAL SUB-TABS ── */}
        <div style={{
          padding: '0.5rem 1.5rem',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-surface-hover)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem'
        }}>
          {[
            { id: 'report', label: '📜 Resmi Karne & Başarı', icon: Award },
            { id: 'tests', label: `🧪 Sınav Geçmişi (${stats.testCount})`, icon: Activity },
            { id: 'notes', label: '📝 Öğretmen Değerlendirme Notu', icon: Edit2 }
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
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all 0.15s ease'
              }}
            >
              <t.icon size={13} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* ── 3. MODAL SCROLLABLE BODY ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>

          {/* ════════════ TAB 1: RESMİ KARNE & BAŞARI ════════════ */}
          {activeTab === 'report' && (
            <>
              {/* 4 Core KPI Summary Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '0.75rem'
              }}>
                {/* Total Solved Questions */}
                <div style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', borderRadius: '1rem', padding: '0.85rem 1rem' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>Toplam Çözülen Soru</span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-text)' }}>{stats.totalQuestions} Soru</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', marginTop: 2 }}>{stats.testCount} Sınav ({stats.bookTestsCount} Kitap Testi)</span>
                </div>

                {/* Overall Accuracy % */}
                <div style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', borderRadius: '1rem', padding: '0.85rem 1rem' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>Genel Başarı Puanı</span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 900, color: stats.avgScore >= 70 ? '#10b981' : stats.avgScore >= 45 ? '#f59e0b' : '#ef4444' }}>%{stats.avgScore}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', marginTop: 2 }}>Ortalama {stats.avgNet} Net</span>
                </div>

                {/* Accuracy D / Y / B */}
                <div style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', borderRadius: '1rem', padding: '0.85rem 1rem' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>Doğru / Yanlış / Boş</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#10b981' }}>{stats.totalCorrect}D</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#ef4444' }}>{stats.totalWrong}Y</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--color-text-muted)' }}>{stats.totalBlank}B</span>
                  </div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', display: 'block', marginTop: 2 }}>Toplam {stats.totalQuestions} Soru</span>
                </div>

                {/* Homework Completion */}
                <div style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', borderRadius: '1rem', padding: '0.85rem 1rem' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>Ödev Tamamlama</span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#6366f1' }}>{homeworkMetrics.completed} / {homeworkMetrics.total}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', marginTop: 2 }}>{homeworkMetrics.pending} Bekleyen Ödev</span>
                </div>
              </div>

              {/* Gelişim Grafiği (Son Sınavlar Başarı Eğrisi) */}
              {stats.chartHistory.length > 1 && (
                <div style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', borderRadius: '1.15rem', padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <h5 style={{ margin: 0, fontWeight: 900, fontSize: '0.88rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <TrendingUp size={16} color="#6366f1" /> Tarihsel Başarı Gidişatı &amp; Sınav Eğrisi
                    </h5>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>Son {stats.chartHistory.length} Sınav</span>
                  </div>
                  <div style={{ height: 160, width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.chartHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
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
                        <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#scoreGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* 📚 Branş Bazında Karne Tablosu */}
              <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: '1.15rem', padding: '1rem' }}>
                <h5 style={{ margin: '0 0 0.85rem', fontWeight: 900, fontSize: '0.92rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BookOpen size={16} color="#6366f1" /> Ders &amp; Branş Başarı Tablosu
                </h5>

                {stats.subjects.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                    Henüz çözülen ders verisi bulunmuyor.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {stats.subjects.map(s => {
                      const sc = s.theme;
                      const letterGrade = s.avg >= 85 ? 'A (Pekiyi)' : s.avg >= 70 ? 'B (İyi)' : s.avg >= 50 ? 'C (Orta)' : 'D (Geliştirilmeli)';
                      return (
                        <div
                          key={s.name}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '0.75rem 1rem', borderRadius: '0.85rem',
                            background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)',
                            flexWrap: 'wrap', gap: '0.5rem'
                          }}
                        >
                          <div style={{ minWidth: 140 }}>
                            <span style={{ fontWeight: 900, fontSize: '0.88rem', color: sc.accent || '#6366f1' }}>{s.name}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block' }}>{s.count} Sınav · {s.total} Soru</span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.78rem' }}>
                            <span style={{ color: '#10b981', fontWeight: 800 }}>{s.correct} Doğru</span>
                            <span style={{ color: '#ef4444', fontWeight: 800 }}>{s.wrong} Yanlış</span>
                            <span style={{ color: 'var(--color-text-muted)', fontWeight: 800 }}>{s.blank} Boş</span>
                            <span style={{ color: '#6366f1', fontWeight: 900 }}>{s.avgNet} Net</span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: 99,
                              background: s.avg >= 70 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                              color: s.avg >= 70 ? '#10b981' : '#f59e0b',
                              fontWeight: 900, fontSize: '0.8rem'
                            }}>
                              %{s.avg}
                            </span>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>{letterGrade}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 📝 Öğretmen Değerlendirme Notu Görüntüleme */}
              {teacherNote && (
                <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1.5px solid rgba(99, 102, 241, 0.25)', borderRadius: '1rem', padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#6366f1', textTransform: 'uppercase' }}>📝 Öğretmen Değerlendirme Notu</span>
                    <button onClick={() => setActiveTab('notes')} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer' }}>Düzenle</button>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--color-text)', fontStyle: 'italic', lineHeight: 1.4 }}>
                    "{teacherNote}"
                  </p>
                </div>
              )}
            </>
          )}

          {/* ════════════ TAB 2: SINAV GEÇMİŞİ ════════════ */}
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

          {/* ════════════ TAB 3: ÖĞRETMEN DEĞERLENDİRME NOTU ════════════ */}
          {activeTab === 'notes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h5 style={{ margin: 0, fontWeight: 900, fontSize: '0.92rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Edit2 size={16} color="#6366f1" /> Öğretmen Gelişim &amp; Değerlendirme Notu
                </h5>
                {noteSavedAlert && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Check size={14} /> Not kaydedildi!
                  </span>
                )}
              </div>

              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                Bu not hem karne yazdırma ekranında hem de veliye gönderilen WhatsApp mesajında yer alır. Öğrencinin güçlü yanlarını ve gelişmesi gereken alanları buraya yazabilirsiniz.
              </p>

              <textarea
                rows={5}
                value={teacherNote}
                onChange={(e) => setTeacherNote(e.target.value)}
                placeholder="Örn: Ahmet bu dönem Matematik dersinde çok gayretli. Paragraf ve problem çözme soru adetlerini artırması durumunda başarısı daha da yükselecektir..."
                style={{
                  width: '100%', padding: '0.85rem', borderRadius: '0.85rem',
                  border: '1.5px solid var(--color-border-input)', background: 'var(--color-surface-hover)',
                  color: 'var(--color-text)', fontSize: '0.85rem', outline: 'none', resize: 'vertical',
                  boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.4
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  onClick={handleSaveNote}
                  disabled={isSavingNote}
                  style={{
                    padding: '0.55rem 1.25rem', borderRadius: '0.75rem',
                    background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                    border: 'none', color: '#ffffff', fontWeight: 900, fontSize: '0.8rem',
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)'
                  }}
                >
                  <Check size={15} /> {isSavingNote ? 'Kaydediliyor...' : 'Notu Kaydet'}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* ── 4. MODAL BOTTOM ACTIONS BAR ── */}
        <div style={{
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

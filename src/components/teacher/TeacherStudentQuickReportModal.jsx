import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  X, User, Key, Check, Copy, Share2, MessageSquare,
  Calendar, Award, Target, BookOpen, Clock, Activity,
  ChevronRight, ExternalLink, CheckCircle2, AlertCircle, Edit2
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { getAvatarBg, getSubjectTheme } from '../../config/subjectThemes';
import { getSubmissionScorePct } from '../../pages/TeacherDashboard';
import { timeAgo } from '../../utils/dateHelpers';

export default function TeacherStudentQuickReportModal({
  student,
  submissions = [],
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

  if (!student) return null;

  // Student's Submissions
  const studentSubs = useMemo(() => {
    return submissions
      .filter(s => s.studentId === student.id)
      .sort((a, b) => new Date(b.submittedAt || b.createdAt || 0) - new Date(a.submittedAt || a.createdAt || 0));
  }, [submissions, student.id]);

  // Performance Metrics
  const stats = useMemo(() => {
    let totalQuestions = 0;
    let totalCorrect = 0;
    let totalWrong = 0;
    let totalBlank = 0;
    let validScoreSum = 0;
    let validScoreCount = 0;

    const subjectMap = {};

    studentSubs.forEach(sub => {
      const correct = sub.correctCount ?? sub.correct ?? 0;
      const wrong = sub.wrongCount ?? sub.wrong ?? 0;
      const blank = sub.blankCount ?? sub.emptyCount ?? 0;
      const qCount = sub.totalQuestions || (correct + wrong + blank) || (Array.isArray(sub.answers) ? sub.answers.length : 10);

      totalQuestions += qCount;
      totalCorrect += correct;
      totalWrong += wrong;
      totalBlank += blank;

      const pct = getSubmissionScorePct(sub);
      if (pct !== null) {
        validScoreSum += pct;
        validScoreCount++;
      }

      // Subject breakdown
      const subName = sub.subject || sub.testSubject || (sub.testTitle ? sub.testTitle.split(' ')[0] : 'Genel') || 'Genel';
      if (!subjectMap[subName]) {
        subjectMap[subName] = { name: subName, scoreSum: 0, count: 0, correct: 0, total: 0 };
      }
      if (pct !== null) {
        subjectMap[subName].scoreSum += pct;
        subjectMap[subName].count += 1;
      }
      subjectMap[subName].correct += correct;
      subjectMap[subName].total += qCount;
    });

    const avgScore = validScoreCount > 0 ? Math.round(validScoreSum / validScoreCount) : 0;
    const subjects = Object.values(subjectMap).map(s => ({
      ...s,
      avg: s.count > 0 ? Math.round(s.scoreSum / s.count) : 0
    })).sort((a, b) => b.avg - a.avg);

    return {
      totalQuestions,
      totalCorrect,
      totalWrong,
      totalBlank,
      avgScore,
      testCount: studentSubs.length,
      subjects
    };
  }, [studentSubs]);

  // Copy Password Handler
  const handleCopyPassword = () => {
    navigator.clipboard.writeText(student.password || '123456');
    setCopiedPwd(true);
    setTimeout(() => setCopiedPwd(false), 2000);
  };

  // WhatsApp Message Generator
  const generateWhatsAppMessage = () => {
    const gName = grades.find(g => String(g.id) === String(student.gradeId) || g.name === student.gradeId)?.name || student.grade || 'Öğrenci';
    const topSubjects = stats.subjects.map(s => `  • ${s.name}: %${s.avg} Başarı (${s.total} Soru)`).join('\n');

    return `📚 *E-TEST AKADEMİK GELİŞİM RAPORU* 📚\n\n` +
      `Sayın Velimiz,\n` +
      `*'${student.name}'* adlı öğrencimizin (${gName}) E-Test platformundaki güncel çalışma ve başarı özeti:\n\n` +
      `📊 *Genel İstatistikler:*\n` +
      `• Çözülen Soru Sayısı: ${stats.totalQuestions} Soru\n` +
      `• Tamamlanan Test / Sınav: ${stats.testCount} Adet\n` +
      `• Genel Başarı Ortalaması: %${stats.avgScore}\n` +
      `• Doğru / Yanlış: ${stats.totalCorrect} Doğru, ${stats.totalWrong} Yanlış\n\n` +
      (topSubjects ? `📘 *Ders Bazlı Başarılar:*\n${topSubjects}\n\n` : '') +
      `Öğrencimizin gösterdiği gayret için tebrik eder, verimli çalışmalar dileriz.\n\n` +
      `👨‍🏫 *Öğretmen:* ${teacherName}`;
  };

  const handleSendWhatsApp = () => {
    const msg = generateWhatsAppMessage();
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleCopyWhatsAppText = () => {
    const msg = generateWhatsAppMessage();
    navigator.clipboard.writeText(msg);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2500);
  };

  const gradeName = grades.find(g => String(g.id) === String(student.gradeId) || g.name === student.gradeId)?.name || student.grade || student.className || 'Sınıf Belirtilmemiş';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '1rem'
    }}>
      <div style={{
        background: isDark ? 'var(--color-surface, #1e293b)' : '#ffffff',
        borderRadius: '1.5rem',
        border: '1.5px solid var(--color-border)',
        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
        width: '100%',
        maxWidth: 620,
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: 'var(--color-text)'
      }}>
        {/* ── MODAL HEADER ── */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1.5px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: isDark ? 'rgba(30, 41, 59, 0.7)' : '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: 50,
              height: 50,
              borderRadius: '1rem',
              background: getAvatarBg(student.name?.length || 0),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 900,
              fontSize: '1.2rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              border: '2px solid white'
            }}>
              {(student.name || 'Ö').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.15rem', color: 'var(--color-text)' }}>
                  {student.name}
                </h3>
                <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 99, background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', fontWeight: 800 }}>
                  🎓 {gradeName}
                </span>
              </div>
              <span style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                {student.email}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* ── SCROLLABLE BODY ── */}
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          
          {/* Quick Access & Password Bar */}
          <div style={{
            background: 'var(--color-surface-hover)',
            border: '1.5px solid var(--color-border)',
            borderRadius: '1rem',
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.65rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>Giriş Şifresi:</span>
              <span style={{
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                fontWeight: 900,
                color: '#fbbf24',
                background: 'rgba(245, 158, 11, 0.15)',
                padding: '2px 8px',
                borderRadius: '0.45rem',
                border: '1px solid rgba(245, 158, 11, 0.3)'
              }}>
                {student.password || '123456'}
              </span>
              <button
                type="button"
                onClick={handleCopyPassword}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border-input)',
                  borderRadius: '0.45rem',
                  padding: '2px 6px',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  color: 'var(--color-text)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3
                }}
                title="Şifreyi Kopyala"
              >
                {copiedPwd ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                <span>{copiedPwd ? 'Kopyalandı' : 'Kopyala'}</span>
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <button
                type="button"
                onClick={() => onToggleCoaching && onToggleCoaching(student.id)}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: 99,
                  border: isCoached ? 'none' : '1px solid var(--color-border-input)',
                  background: isCoached ? 'linear-gradient(135deg, #7c3aed, #6366f1)' : 'var(--color-surface)',
                  color: isCoached ? '#ffffff' : 'var(--color-text-muted)',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <Target size={12} />
                <span>{isCoached ? '🎯 Koçlukta' : '+ Koçluğa Ekle'}</span>
              </button>

              <button
                type="button"
                onClick={() => { onClose(); onEditStudent && onEditStudent(student); }}
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: '0.55rem',
                  border: '1px solid var(--color-border-input)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3
                }}
              >
                <Edit2 size={12} /> Düzenle
              </button>
            </div>
          </div>

          {/* 4 Academic KPI Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.65rem' }}>
            <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: '1rem', padding: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: '0.65rem', background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Activity size={20} />
              </div>
              <div>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Çözülen Soru</span>
                <span style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-text)', display: 'block', lineHeight: 1.1 }}>{stats.totalQuestions}</span>
              </div>
            </div>

            <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: '1rem', padding: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: '0.65rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Award size={20} />
              </div>
              <div>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Başarı Oranı</span>
                <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#10b981', display: 'block', lineHeight: 1.1 }}>%{stats.avgScore}</span>
              </div>
            </div>

            <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: '1rem', padding: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: '0.65rem', background: 'rgba(2, 132, 199, 0.15)', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <BookOpen size={20} />
              </div>
              <div>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Tamamlanan Sınav</span>
                <span style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-text)', display: 'block', lineHeight: 1.1 }}>{stats.testCount} Test</span>
              </div>
            </div>

            <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: '1rem', padding: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: '0.65rem', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckCircle2 size={20} />
              </div>
              <div>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Doğru / Yanlış</span>
                <span style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--color-text)', display: 'block', lineHeight: 1.1 }}>
                  {stats.totalCorrect} <span style={{ color: '#10b981' }}>D</span> / {stats.totalWrong} <span style={{ color: '#ef4444' }}>Y</span>
                </span>
              </div>
            </div>
          </div>

          {/* Subject Performance Breakdown */}
          {stats.subjects.length > 0 && (
            <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: '1.15rem', padding: '1rem' }}>
              <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <BookOpen size={15} color="#6366f1" /> Ders Bazlı Başarı Analizi
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                {stats.subjects.map(s => {
                  const theme = getSubjectTheme(s.name);
                  return (
                    <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text)', width: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.name}
                      </span>
                      <div style={{ flex: 1, height: 7, background: 'var(--color-border)', borderRadius: 9, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${s.avg}%`, background: s.avg >= 70 ? '#10b981' : s.avg >= 45 ? '#f59e0b' : '#ef4444', borderRadius: 9 }} />
                      </div>
                      <span style={{ fontSize: '0.74rem', fontWeight: 900, color: s.avg >= 70 ? '#10b981' : s.avg >= 45 ? '#f59e0b' : '#ef4444', minWidth: 34, textAlign: 'right' }}>
                        %{s.avg}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Exam History */}
          <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: '1.15rem', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Clock size={15} color="#10b981" /> Son Çözülen Sınavlar
              </h4>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>{studentSubs.length} sınav</span>
            </div>

            {studentSubs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>
                Öğrenci henüz bir sınav çözmedi.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 180, overflowY: 'auto' }}>
                {studentSubs.slice(0, 5).map((sub, idx) => {
                  const scorePct = getSubmissionScorePct(sub);
                  const correct = sub.correctCount ?? sub.correct ?? 0;
                  const wrong = sub.wrongCount ?? sub.wrong ?? 0;
                  return (
                    <div key={sub.id || idx} style={{
                      padding: '0.55rem 0.75rem',
                      borderRadius: '0.65rem',
                      background: 'var(--color-surface-hover)',
                      border: '1px solid var(--color-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem'
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: '0.8rem', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {sub.testTitle || sub.title || 'Sınav'}
                        </p>
                        <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                          {timeAgo(sub.submittedAt || sub.createdAt)} · {correct}D {wrong}Y
                        </span>
                      </div>
                      {scorePct !== null && (
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '0.45rem',
                          background: scorePct >= 70 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: scorePct >= 70 ? '#10b981' : '#ef4444',
                          fontWeight: 900,
                          fontSize: '0.75rem',
                          flexShrink: 0
                        }}>
                          %{scorePct}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* ── FOOTER ACTIONS (WHATSAPP & DETAILED COACHING) ── */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1.5px solid var(--color-border)',
          background: isDark ? 'rgba(15, 23, 42, 0.8)' : '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={handleSendWhatsApp}
              style={{
                padding: '0.6rem 0.85rem',
                borderRadius: '0.75rem',
                border: 'none',
                background: 'linear-gradient(135deg, #25D366, #128C7E)',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                boxShadow: '0 3px 12px rgba(37, 211, 102, 0.3)'
              }}
            >
              <MessageSquare size={15} />
              <span>Veliye WhatsApp Karnesi</span>
            </button>

            <button
              type="button"
              onClick={handleCopyWhatsAppText}
              style={{
                padding: '0.6rem 0.85rem',
                borderRadius: '0.75rem',
                border: '1.5px solid var(--color-border-input)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                fontWeight: 800,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5
              }}
            >
              {copiedMsg ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              <span>{copiedMsg ? 'Metin Kopyalandı' : 'Raporu Kopyala'}</span>
            </button>
          </div>

          <Link to={`/coaching/${student.id}`} style={{ textDecoration: 'none', width: '100%' }}>
            <button
              type="button"
              style={{
                width: '100%',
                padding: '0.65rem 1rem',
                borderRadius: '0.75rem',
                background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
                border: 'none',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)'
              }}
            >
              <Calendar size={15} />
              <span>Öğrencinin Haftalık Çalışma &amp; Koçluk Paneline Git ➔</span>
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

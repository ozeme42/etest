import React, { useMemo } from 'react';
import {
  AlertTriangle, Target, TrendingDown, Award, Users,
  Sparkles, BookOpen, MessageSquare, ChevronRight, CheckCircle2
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { getAvatarBg, getSubjectTheme } from '../../config/subjectThemes';
import { getSubmissionScorePct } from '../../pages/TeacherDashboard';

export default function TeacherClassPulseRadar({
  students = [],
  submissions = [],
  onSelectStudent,
  onLaunchAiForTopic
}) {
  const { isDark } = useTheme();

  // 1. Identify At-Risk Students (< %50 Avg or Inactive for > 7 days)
  const atRiskStudents = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 86400000;

    return students.map(s => {
      const sSubs = submissions.filter(sub => sub.studentId === s.id);
      const scoredSubs = sSubs.filter(sub => getSubmissionScorePct(sub) !== null);
      const avg = scoredSubs.length ? Math.round(scoredSubs.reduce((acc, sub) => acc + (getSubmissionScorePct(sub) || 0), 0) / scoredSubs.length) : 0;
      
      const lastSubDate = sSubs.length > 0
        ? Math.max(...sSubs.map(sub => new Date(sub.submittedAt || sub.createdAt || 0).getTime()))
        : 0;

      const isInactive = sSubs.length === 0 || lastSubDate < sevenDaysAgo;
      const isLowScore = scoredSubs.length > 0 && avg < 50;

      let riskReason = '';
      if (isLowScore && isInactive) riskReason = `⚠️ Başarı % ${avg} ve 7+ gündür test çözmedi`;
      else if (isLowScore) riskReason = `⚠️ Düşük Başarı Oranı (% ${avg})`;
      else if (isInactive) riskReason = '⏳ 7+ gündür hiçbir test/ödev çözmedi';

      return {
        ...s,
        avg,
        testCount: sSubs.length,
        isAtRisk: Boolean(riskReason),
        riskReason
      };
    })
    .filter(s => s.isAtRisk)
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 4);
  }, [students, submissions]);

  // 2. Identify Top 3 Weakest Topics Across the Entire Class
  const weakestTopics = useMemo(() => {
    const topicStatsMap = {};

    submissions.forEach(sub => {
      const topicName = sub.topicName || sub.topic || (sub.testTitle ? sub.testTitle.replace(/^(\d+\.\s*Sınıf|LGS|TYT|AYT)\s*/i, '') : null) || 'Genel Konu';
      const subjectName = sub.subject || sub.testSubject || 'Genel';

      if (!topicStatsMap[topicName]) {
        topicStatsMap[topicName] = {
          name: topicName,
          subject: subjectName,
          totalQuestions: 0,
          wrongQuestions: 0,
          submissionsCount: 0
        };
      }

      const correct = sub.correctCount ?? sub.correct ?? 0;
      const wrong = sub.wrongCount ?? sub.wrong ?? 0;
      const total = sub.totalQuestions || (correct + wrong) || 10;

      topicStatsMap[topicName].totalQuestions += total;
      topicStatsMap[topicName].wrongQuestions += wrong;
      topicStatsMap[topicName].submissionsCount += 1;
    });

    return Object.values(topicStatsMap)
      .map(item => {
        const errorRate = item.totalQuestions > 0 ? Math.round((item.wrongQuestions / item.totalQuestions) * 100) : 0;
        return { ...item, errorRate };
      })
      .filter(item => item.totalQuestions >= 5 && item.errorRate >= 30)
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 3);
  }, [submissions]);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
      gap: '1rem'
    }}>
      
      {/* ── CARD A: AT-RISK STUDENTS (KIRMIZI ALARM) ── */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: '1.25rem',
        padding: '1.15rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={17} color="#ef4444" />
            ⚠️ Destek Gereken Öğrenciler (Riskli)
          </h4>
          <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 99, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontWeight: 800 }}>
            {atRiskStudents.length} Öğrenci
          </span>
        </div>

        {atRiskStudents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#10b981', fontSize: '0.82rem', fontWeight: 800 }}>
            <CheckCircle2 size={32} style={{ margin: '0 auto 0.4rem', opacity: 0.8 }} />
            Tüm sınıfın performansı ve katılımı çok iyi durumda!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {atRiskStudents.map((std, idx) => (
              <div
                key={std.id}
                style={{
                  background: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '0.85rem',
                  padding: '0.65rem 0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.65rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: getAvatarBg(idx),
                    color: '#fff', fontWeight: 900, fontSize: '0.8rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    {(std.name || 'Ö').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: '0.84rem', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {std.name}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#ef4444', fontWeight: 700 }}>
                      {std.riskReason}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectStudent && onSelectStudent(std)}
                  style={{
                    padding: '0.35rem 0.65rem',
                    borderRadius: '0.55rem',
                    background: 'var(--color-surface)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#ef4444',
                    fontWeight: 800,
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    flexShrink: 0
                  }}
                  title="Öğrenci Karnesi & Veli WhatsApp"
                >
                  <MessageSquare size={12} />
                  <span>Veli / Karne</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── CARD B: TOP WEAKEST TOPICS & REMEDIAL AI LAUNCHER ── */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: '1.25rem',
        padding: '1.15rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Target size={17} color="#f59e0b" />
            🎯 Sınıfın En Çok Hata Yaptığı Konular
          </h4>
          <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 99, background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontWeight: 800 }}>
            Telafi Önerisi
          </span>
        </div>

        {weakestTopics.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.82rem', fontWeight: 700 }}>
            <BookOpen size={32} style={{ margin: '0 auto 0.4rem', opacity: 0.4 }} />
            Sınıf genelinde kritik hata oranı yüksek bir konu tespit edilmedi.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {weakestTopics.map((topic, idx) => (
              <div
                key={topic.name || idx}
                style={{
                  background: isDark ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  borderRadius: '0.85rem',
                  padding: '0.65rem 0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.65rem'
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 900, fontSize: '0.84rem', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {idx + 1}. {topic.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <span style={{ fontSize: '0.68rem', color: '#d97706', fontWeight: 800 }}>
                      %{topic.errorRate} Hata Oranı
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                      ({topic.totalQuestions} soru çözüldü)
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onLaunchAiForTopic && onLaunchAiForTopic(topic.name, topic.subject)}
                  style={{
                    padding: '0.35rem 0.65rem',
                    borderRadius: '0.55rem',
                    background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 900,
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    boxShadow: '0 2px 8px rgba(139,92,246,0.3)',
                    flexShrink: 0
                  }}
                  title="Bu konuya özel yapay zeka telafi testi üret"
                >
                  <Sparkles size={12} />
                  <span>Telafi Üret</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

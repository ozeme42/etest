import React from 'react';
import { CheckCircle2, Award, ArrowLeft, Trophy, FileText, Check, X, Circle } from 'lucide-react';

export default function ReviewResultModal({
  isOpen,
  onClose,
  studentName = 'Öğrenci',
  testTitle = 'Sınav / Ödev',
  score = 0,
  correctCount = 0,
  wrongCount = 0,
  blankCount = 0,
  netScore = null,
  totalQuestions = 0,
  overallFeedback = '',
  sectionStats = [],
  isTeacher = true
}) {
  if (!isOpen) return null;

  const total = totalQuestions || (correctCount + wrongCount + blankCount) || 1;
  const net = netScore !== null && netScore !== undefined ? Number(netScore) : Math.max(0, correctCount - (wrongCount * 0.25));
  const scorePct = Math.max(0, Math.min(100, Math.round(score)));

  const getStatus = (pct) => {
    if (pct >= 85) return { label: 'Mükemmel 🌟', color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' };
    if (pct >= 70) return { label: 'Çok İyi 🎯', color: '#0284c7', bg: 'rgba(2,132,199,0.12)', border: 'rgba(2,132,199,0.3)' };
    if (pct >= 50) return { label: 'Başarılı 👍', color: '#d97706', bg: 'rgba(217,119,6,0.12)', border: 'rgba(217,119,6,0.3)' };
    return { label: 'Geliştirilmeli 📈', color: '#dc2626', bg: 'rgba(220,38,38,0.12)', border: 'rgba(220,38,38,0.3)' };
  };

  const status = getStatus(scorePct);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.82)',
      backdropFilter: 'blur(10px)',
      zIndex: 999999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.25rem',
      overflowY: 'auto',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '1.5rem',
        width: '100%',
        maxWidth: '680px',
        color: '#0f172a',
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
        margin: 'auto',
        position: 'relative'
      }}>
        {/* TOP HEADER */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: status.bg,
            border: `2px solid ${status.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem'
          }}>
            🎉
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
            {isTeacher ? 'Değerlendirme Başarıyla Kaydedildi!' : 'Sınav Sonuç Raporu'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '0.15rem 0.55rem', borderRadius: 99, fontWeight: 900, fontSize: '0.78rem' }}>
              🎓 {studentName}
            </span>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 800 }}>
              {testTitle}
            </span>
          </div>
        </div>

        {/* SUMMARY METRICS CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '0.75rem' }}>
          {/* Card 1: BAŞARI DURUMU */}
          <div style={{
            background: '#f8fafc',
            border: `1.5px solid ${status.border}`,
            borderRadius: '1rem',
            padding: '0.85rem 0.65rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.2rem'
          }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              BAŞARI DURUMU
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: status.color, lineHeight: 1.1 }}>
              %{scorePct}
            </div>
            <span style={{
              fontSize: '0.72rem', fontWeight: 900,
              color: status.color, background: status.bg,
              border: `1px solid ${status.border}`,
              padding: '0.12rem 0.5rem', borderRadius: '12px', marginTop: '0.2rem'
            }}>
              {status.label}
            </span>
          </div>

          {/* Card 2: DOĞRU / YANLIŞ */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '1rem',
            padding: '0.85rem 0.65rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.2rem'
          }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              DOĞRU / YANLIŞ
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#16a34a', marginTop: '0.1rem' }}>
              {correctCount} <span style={{ fontSize: '0.85rem', color: '#dc2626' }}>D / {wrongCount} Y</span>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
              {blankCount > 0 ? `(${blankCount} Boş Soru)` : '(Boş Soru Yok)'}
            </span>
          </div>

          {/* Card 3: NET PUAN */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '1rem',
            padding: '0.85rem 0.65rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.2rem'
          }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              NET PUAN
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0284c7', lineHeight: 1.1 }}>
              {net.toFixed(2)}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
              Toplam {total} Soru
            </span>
          </div>
        </div>

        {/* TEACHER FEEDBACK NOTE (IF ANY) */}
        {overallFeedback && overallFeedback.trim() && (
          <div style={{
            background: '#f0fdf4',
            border: '1.5px solid #bbf7d0',
            borderRadius: '0.85rem',
            padding: '0.85rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem'
          }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#15803d', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              💬 Öğretmen Karne Mesajı:
            </div>
            <div style={{ fontSize: '0.86rem', color: '#14532d', fontWeight: 600, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {overallFeedback}
            </div>
          </div>
        )}

        {/* SECTION BREAKDOWN (IF MULTI-SECTION) */}
        {Array.isArray(sectionStats) && sectionStats.length > 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h4 style={{ margin: 0, fontWeight: 900, fontSize: '0.88rem', color: '#334155' }}>
              📊 Bölüm Bazlı Sonuç Özeti
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {sectionStats.map((sec, sIdx) => {
                const secStat = getStatus(sec.secSuccessRate || 0);
                return (
                  <div
                    key={sIdx}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.75rem',
                      padding: '0.65rem 0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.45rem'
                    }}
                  >
                    <span style={{ fontWeight: 800, fontSize: '0.84rem', color: '#0f172a' }}>
                      {sec.title}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.78rem', fontWeight: 800 }}>
                      <span style={{ color: '#16a34a' }}>{sec.mcDoğru || 0} D</span>
                      <span style={{ color: '#dc2626' }}>{sec.mcYanlış || 0} Y</span>
                      {(sec.mcBoş || 0) > 0 && <span style={{ color: '#64748b' }}>{sec.mcBoş} B</span>}
                      <span style={{
                        padding: '0.15rem 0.45rem',
                        background: secStat.bg,
                        border: `1px solid ${secStat.border}`,
                        color: secStat.color,
                        borderRadius: '0.4rem',
                        fontWeight: 900,
                        fontSize: '0.75rem'
                      }}>
                        %{sec.secSuccessRate || 0}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CLOSE BUTTON */}
        <button
          type="button"
          onClick={onClose}
          style={{
            width: '100%',
            padding: '0.85rem',
            borderRadius: '0.85rem',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: 'white',
            fontWeight: 900,
            fontSize: '0.92rem',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
            marginTop: '0.25rem'
          }}
        >
          <CheckCircle2 size={18} /> İncelemeyi Tamamla & Listeye Dön
        </button>
      </div>
    </div>
  );
}

import React, { useMemo, useEffect } from 'react';
import { isSectionOpenEnded, isQuestionOE, checkIsOE, unwrapUserAnswer } from './quizFormatHelpers';
import { triggerCelebrationConfetti } from '../../../services/feedbackService';

export default function MultiResultModal({ test, sections, sectionAnswers, onConfirmClose, onReview, teacherScores = {}, teacherNotes = {}, overallFeedback = '', isReviewMode = false, isTeacher = false }) {
  useEffect(() => {
    if (!isTeacher) {
      triggerCelebrationConfetti({ particleCount: 100 });
    }
  }, [isTeacher]);
  let totalAllQuestions = 0;
  let totalAllEarnedPts = 0;
  let totalAllMaxPts = 0;
  let totalDoğru = 0;
  let totalYanlış = 0;
  let totalBoş = 0;

  let totalMCQuestions = 0;
  let totalMCDoğru = 0;
  let totalMCYanlış = 0;
  let totalMCBoş = 0;

  let totalOEQuestions = 0;
  let totalOECevaplanan = 0;
  let totalOEEvaluated = 0;

  const sectionStats = sections.map((sec, idx) => {
    const bankQ = sec.bankQ || {};
    const isSecOE = checkIsOE(bankQ);
    const sa = sectionAnswers[sec.id] || { answers: {}, openEndedText: {} };

    let secDoğru = 0;
    let secYanlış = 0;
    let secBoş = 0;
    let secEarnedPts = 0;
    let secMaxPts = 0;
    let oeCevaplanan = 0;
    let oeEvaluated = 0;
    let hasAnyOE = isSecOE;

    const secImgCount = Array.isArray(sec.bankQ?.imageUrls) ? sec.bankQ.imageUrls.length : (Array.isArray(sec.imageUrls) ? sec.imageUrls.length : 0);
    const secQCount = sec.qCount || (sec.resolvedQuestions?.length > 0 ? sec.resolvedQuestions.length : (secImgCount > 0 ? secImgCount : 1));

    for (let i = 1; i <= secQCount; i++) {
      const qObj = (sec.resolvedQuestions && sec.resolvedQuestions[i - 1]) || {};
      const isQOE = isQuestionOE(qObj, sec, null, sa.answers?.[i]);
      secMaxPts += 10;
      totalAllMaxPts += 10;
      totalAllQuestions++;

      const teacherSc = teacherScores[sec.id]?.[i];
      const hasTeacherScore = teacherSc !== undefined && teacherSc !== null;

      if (isQOE) {
        hasAnyOE = true;
        totalOEQuestions++;
        const textVal = sa.openEndedText?.[i] || '';
        if (textVal && textVal.trim() !== '') {
          oeCevaplanan++;
          totalOECevaplanan++;
        }
        if (hasTeacherScore) {
          oeEvaluated++;
          totalOEEvaluated++;
          if (teacherSc === 'empty') {
            secBoş++;
            totalBoş++;
          } else {
            const numSc = Number(teacherSc);
            secEarnedPts += numSc;
            totalAllEarnedPts += numSc;
            if (numSc >= 5) {
              secDoğru++;
              totalDoğru++;
            } else {
              secYanlış++;
              totalYanlış++;
            }
          }
        } else {
          secBoş++;
          totalBoş++;
        }
      } else {
        totalMCQuestions++;
        const userAnsObj = sa.answers?.[i];
        const userAns = typeof userAnsObj === 'object' ? userAnsObj?.userAnswer : userAnsObj;

        if (hasTeacherScore) {
          if (teacherSc === 'empty') {
            secBoş++;
            totalBoş++;
            totalMCBoş++;
          } else {
            const numSc = Number(teacherSc);
            secEarnedPts += numSc;
            totalAllEarnedPts += numSc;
            if (numSc >= 5) {
              secDoğru++;
              totalDoğru++;
              totalMCDoğru++;
            } else {
              secYanlış++;
              totalYanlış++;
              totalMCYanlış++;
            }
          }
        } else if (userAns === undefined || userAns === null || userAns === '') {
          secBoş++;
          totalBoş++;
          totalMCBoş++;
        } else {
          const testCtx = resolveTestContext(test, sec, bankQ);
          const isCorrect = checkIsAnswerCorrect(userAns, qObj, testCtx, i);
          if (isCorrect) {
            secDoğru++;
            totalDoğru++;
            totalMCDoğru++;
            secEarnedPts += 10;
            totalAllEarnedPts += 10;
          } else {
            secYanlış++;
            totalYanlış++;
            totalMCYanlış++;
          }
        }
      }
    }

    const mcNet = Math.max(0, secDoğru - (secYanlış * 0.25));
    const secSuccessRate = secMaxPts > 0 ? Math.round((secEarnedPts / secMaxPts) * 100) : 0;
    const isSecEvaluated = !hasAnyOE || (oeEvaluated > 0 && oeEvaluated >= oeCevaplanan);

    return {
      title: sec.title || `${idx + 1}. Bölüm`,
      qCount: secQCount,
      isOE: hasAnyOE,
      isSecEvaluated,
      secDoğru,
      secYanlış,
      secBoş,
      mcNet,
      secEarnedPts,
      secMaxPts,
      secSuccessRate,
      oeCevaplanan,
      oeEvaluated
    };
  });

  const totalMCNet = Math.max(0, totalDoğru - (totalYanlış * 0.25));
  const hasOE = totalOEQuestions > 0;
  const isAllGraded = !hasOE || totalOEEvaluated > 0;
  const overallAccuracy = totalAllMaxPts > 0 ? Math.round((totalAllEarnedPts / totalAllMaxPts) * 100) : 0;

  const getSuccessStatus = (rate) => {
    if (rate >= 85) return { label: 'Mükemmel 🌟', text: 'Mükemmel', color: '#10b981', badgeBg: 'rgba(16,185,129,0.15)', badgeBorder: 'rgba(16,185,129,0.3)' };
    if (rate >= 70) return { label: 'Çok İyi 🎯', text: 'Çok İyi', color: '#0284c7', badgeBg: 'rgba(2,132,199,0.15)', badgeBorder: 'rgba(2,132,199,0.3)' };
    if (rate >= 50) return { label: 'Başarılı 👍', text: 'Başarılı', color: '#d97706', badgeBg: 'rgba(217,119,6,0.15)', badgeBorder: 'rgba(217,119,6,0.3)' };
    return { label: 'Geliştirilmeli 📈', text: 'Geliştirilmeli', color: '#dc2626', badgeBg: 'rgba(220,38,38,0.15)', badgeBorder: 'rgba(220,38,38,0.3)' };
  };

  const overallStatus = getSuccessStatus(overallAccuracy);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--color-modal-overlay, rgba(15, 23, 42, 0.75))', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', overflowY: 'auto' }}>
      <div style={{ background: 'var(--color-surface, #ffffff)', border: '1.5px solid var(--color-border, #e2e8f0)', borderRadius: '1.5rem', width: '100%', maxWidth: '750px', color: 'var(--color-text, #0f172a)', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: '0 25px 60px rgba(0,0,0,0.35)', margin: 'auto' }}>
        
        {/* TOP HEADER */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: overallStatus.badgeBg, border: `2px solid ${overallStatus.badgeBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
            🎉
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, color: 'var(--color-text, #0f172a)' }}>
            {isReviewMode ? (isTeacher ? 'Değerlendirme Başarıyla Kaydedildi!' : 'Sınav Sonuç Raporu') : 'Sınav Başarıyla Tamamlandı!'}
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted, #64748b)', margin: 0, fontWeight: 700 }}>{test.title || test.name}</p>
        </div>

        {/* TEACHER EVALUATION ALERT BANNER (If not yet graded) */}
        {hasOE && totalOEEvaluated === 0 && (!isReviewMode || !isTeacher) && (
          <div style={{ background: 'rgba(124, 58, 237, 0.08)', border: '1.5px solid rgba(167, 139, 250, 0.4)', borderRadius: '1rem', padding: '1.25rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ fontSize: '1.8rem' }}>⏳</div>
            <div>
              <h4 style={{ margin: '0 0 0.3rem 0', fontWeight: 900, color: '#7c3aed', fontSize: '0.95rem' }}>
                Yazılı / Açık Uçlu Cevaplarınız Öğretmen Değerlendirmesine Gönderildi
              </h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted, #475569)', lineHeight: 1.5 }}>
                Çoktan seçmeli sorularınızın puan ve başarı oranı hesaplanmıştır. Açık uçlu ({totalOEQuestions} soru) yanıtlarınız ise öğretmeniniz tarafından incelenip puanlandıktan sonra karnenize yansıyacaktır.
              </p>
            </div>
          </div>
        )}

        {/* TEACHER FEEDBACK NOTE */}
        {overallFeedback && (
          <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '1rem', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              👨‍🏫 Öğretmen Değerlendirme Notu / Geri Bildirimi:
            </div>
            <div style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 600, lineHeight: 1.5 }}>
              {overallFeedback}
            </div>
          </div>
        )}

        {/* OVERALL SUMMARY CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.85rem' }}>
          
          {hasOE && totalMCQuestions === 0 && totalOEEvaluated === 0 && (!isReviewMode || !isTeacher) ? (
            <>
              {/* Pure Open-Ended Pending Evaluation Cards */}
              <div style={{ background: 'var(--color-surface-hover, #f8fafc)', border: '1.5px solid rgba(124, 58, 237, 0.3)', borderRadius: '1rem', padding: '1rem 0.75rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em' }}>DURUM</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#7c3aed', lineHeight: 1.1 }}>⏳</div>
                <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#7c3aed', background: 'rgba(124, 58, 237, 0.1)', border: '1px solid rgba(124, 58, 237, 0.25)', padding: '0.15rem 0.55rem', borderRadius: '12px', marginTop: '0.2rem' }}>
                  Değerlendirmede
                </span>
              </div>

              <div style={{ background: 'var(--color-surface-hover, #f8fafc)', border: '1px solid var(--color-border, #e2e8f0)', borderRadius: '1rem', padding: '1rem 0.75rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em' }}>AÇIK UÇLU YANIT</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#7c3aed', marginTop: '0.15rem' }}>
                  {totalOECevaplanan} / {totalOEQuestions}
                </div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>
                  (Öğretmen İncelemesinde)
                </span>
              </div>

              <div style={{ background: 'var(--color-surface-hover, #f8fafc)', border: '1px solid var(--color-border, #e2e8f0)', borderRadius: '1rem', padding: '1rem 0.75rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em' }}>SONUÇ / PUAN</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#64748b', lineHeight: 1.1 }}>—</div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700 }}>
                  Puanlama Sonrası
                </span>
              </div>
            </>
          ) : (
            <>
              {/* Card 1: BAŞARI DURUMU */}
              <div style={{ background: 'var(--color-surface-hover, #f8fafc)', border: `1.5px solid ${overallStatus.badgeBorder}`, borderRadius: '1rem', padding: '1rem 0.75rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em' }}>BAŞARI DURUMU</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: overallStatus.color, lineHeight: 1.1 }}>%{overallAccuracy}</div>
                <span style={{ fontSize: '0.75rem', fontWeight: 900, color: overallStatus.color, background: overallStatus.badgeBg, border: `1px solid ${overallStatus.badgeBorder}`, padding: '0.15rem 0.55rem', borderRadius: '12px', marginTop: '0.2rem' }}>
                  {overallStatus.label}
                </span>
              </div>

              {/* Card 2: DOĞRU / YANLIŞ / BOŞ */}
              <div style={{ background: 'var(--color-surface-hover, #f8fafc)', border: '1px solid var(--color-border, #e2e8f0)', borderRadius: '1rem', padding: '1rem 0.75rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em' }}>DOĞRU / YANLIŞ</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#16a34a', marginTop: '0.15rem' }}>
                  {totalDoğru} <span style={{ fontSize: '0.85rem', color: '#dc2626' }}>D / {totalYanlış} Y</span>
                </div>
                {totalBoş > 0 ? (
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>({totalBoş} Boş Soru)</span>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700 }}>(Tümü Yanıtlandı)</span>
                )}
              </div>

              {/* Card 3: NET PUAN */}
              <div style={{ background: 'var(--color-surface-hover, #f8fafc)', border: '1px solid var(--color-border, #e2e8f0)', borderRadius: '1rem', padding: '1rem 0.75rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em' }}>NET PUAN</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0284c7', lineHeight: 1.1 }}>{totalMCNet.toFixed(2)}</div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 700 }}>Net</span>
              </div>

              {/* Card 4: AÇIK UÇLU YANIT (if mixed) */}
              {hasOE && (
                <div style={{ background: 'var(--color-surface-hover, #f8fafc)', border: '1px solid var(--color-border, #e2e8f0)', borderRadius: '1rem', padding: '1rem 0.75rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748b)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em' }}>AÇIK UÇLU YANIT</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#7c3aed', marginTop: '0.15rem' }}>
                    {totalOEEvaluated > 0 ? `${totalOEEvaluated} / ${totalOEQuestions} Puanlandı` : `${totalOECevaplanan} / ${totalOEQuestions}`}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: 700 }}>
                    {totalOEEvaluated > 0 ? '✓ Öğretmen Değerlendirdi' : 'Öğretmen Bekleniyor'}
                  </span>
                </div>
              )}
            </>
          )}

        </div>

        {/* BÖLÜM BAZLI DETAYLAR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h4 style={{ margin: 0, fontWeight: 900, fontSize: '0.95rem', color: 'var(--color-text, #334155)' }}>📊 Bölüm Bazlı Sonuç Özeti</h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {sectionStats.map((secStat, sIdx) => {
              const secStatus = getSuccessStatus(secStat.secSuccessRate);

              return (
                <div key={sIdx} style={{ background: 'var(--color-surface-hover, #f8fafc)', border: '1px solid var(--color-border, #e2e8f0)', borderRadius: '0.85rem', padding: '0.85rem 1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.65rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ padding: '0.25rem 0.55rem', background: secStat.isOE ? '#7c3aed' : '#0284c7', borderRadius: '0.4rem', fontSize: '0.72rem', fontWeight: 900, color: 'white' }}>
                      {secStat.isOE ? '✍️ Yazılı Bölüm' : '📝 Test Bölümü'}
                    </span>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--color-text, #0f172a)' }}>{secStat.title}</span>
                  </div>

                  {secStat.isOE && !secStat.isSecEvaluated ? (
                    <span style={{ padding: '0.35rem 0.75rem', borderRadius: '0.5rem', background: 'rgba(124, 58, 237, 0.1)', border: '1px solid rgba(167, 139, 250, 0.4)', color: '#7c3aed', fontSize: '0.8rem', fontWeight: 900 }}>
                      ⏳ Öğretmen Değerlendirmesinde ({secStat.oeCevaplanan}/{secStat.qCount} Yanıt)
                    </span>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.85rem', fontWeight: 800, flexWrap: 'wrap' }}>
                      <span style={{ color: '#16a34a' }}>{secStat.secDoğru} Doğru</span>
                      <span style={{ color: '#dc2626' }}>{secStat.secYanlış} Yanlış</span>
                      <span style={{ color: '#64748b' }}>{secStat.secBoş} Boş</span>
                      
                      <span style={{
                        padding: '0.25rem 0.65rem',
                        background: secStatus.badgeBg,
                        border: `1.5px solid ${secStatus.badgeBorder}`,
                        color: secStatus.color,
                        borderRadius: '0.5rem',
                        fontWeight: 900,
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        %{secStat.secSuccessRate} Başarı
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div style={{ display: 'flex', gap: '0.85rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          {onReview && (
            <button
              onClick={onReview}
              style={{
                flex: 1,
                minWidth: 160,
                padding: '0.85rem 1.25rem',
                borderRadius: '0.85rem',
                background: 'var(--color-surface, #ffffff)',
                border: '1.5px solid var(--color-border, #cbd5e1)',
                color: 'var(--color-text, #334155)',
                fontWeight: 900,
                fontSize: '0.92rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
            >
              <Eye size={18} /> Cevapları Kaydet ve İncele
            </button>
          )}
          <button
            onClick={onConfirmClose}
            style={{
              flex: 1.5,
              minWidth: 180,
              padding: '0.85rem 1.5rem',
              borderRadius: '0.85rem',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none',
              color: 'white',
              fontWeight: 900,
              fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(16,185,129,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <CheckCircle2 size={20} /> {isReviewMode ? (isTeacher ? 'Değerlendirmeyi Onayla & Tamamla' : 'Kapat & Öğrenci Paneline Dön') : 'Sınavı Tamamla & Listeye Dön'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN MULTI-HOMEWORK RUNNER COMPONENT ────────────────────────────────────
